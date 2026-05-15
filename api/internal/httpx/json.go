package httpx

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
)

const maxRequestBytes = 1 << 20 // 1MB cap on inbound JSON to defend against runaway payloads

func DecodeJSON[T any](r *http.Request) (T, error) {
	var v T
	r.Body = http.MaxBytesReader(nil, r.Body, maxRequestBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&v); err != nil {
		return v, decodeError(err)
	}
	if dec.More() {
		return v, BadRequest("request body must contain a single JSON object")
	}
	return v, nil
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(v); err != nil {
		// Headers already sent — nothing to do beyond logging at caller level.
		return
	}
}

func decodeError(err error) error {
	var syn *json.SyntaxError
	var typ *json.UnmarshalTypeError
	switch {
	case errors.As(err, &syn):
		return BadRequest(fmt.Sprintf("malformed JSON at byte %d", syn.Offset))
	case errors.As(err, &typ):
		return BadRequest(fmt.Sprintf("invalid type for field %q (expected %s)", typ.Field, typ.Type))
	case errors.Is(err, io.EOF):
		return BadRequest("request body must not be empty")
	default:
		return BadRequest(err.Error())
	}
}
