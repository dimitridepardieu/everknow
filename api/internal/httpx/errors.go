package httpx

import (
	"errors"
	"net/http"
)

type Error struct {
	Status  int    `json:"-"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *Error) Error() string { return e.Message }

func BadRequest(msg string) *Error {
	return &Error{Status: http.StatusBadRequest, Code: "bad_request", Message: msg}
}

func Unauthorized(msg string) *Error {
	return &Error{Status: http.StatusUnauthorized, Code: "unauthorized", Message: msg}
}

func NotFound(msg string) *Error {
	return &Error{Status: http.StatusNotFound, Code: "not_found", Message: msg}
}

func InternalServer(msg string) *Error {
	return &Error{Status: http.StatusInternalServerError, Code: "internal", Message: msg}
}

func TooManyRequests(msg string) *Error {
	return &Error{Status: http.StatusTooManyRequests, Code: "rate_limited", Message: msg}
}

// WriteError serialises any error as JSON. Known *Error values keep their
// status; everything else degrades to 500 with a generic message so internal
// details never leak to the client.
func WriteError(w http.ResponseWriter, err error) {
	var e *Error
	if errors.As(err, &e) {
		WriteJSON(w, e.Status, e)
		return
	}
	WriteJSON(w, http.StatusInternalServerError, &Error{
		Code:    "internal",
		Message: "something went wrong",
	})
}
