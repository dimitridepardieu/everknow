package httpx_test

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"flashcardacademy/api/internal/httpx"
)

type decodeBody struct {
	Email string `json:"email"`
}

func decode(t *testing.T, body string) (decodeBody, error) {
	t.Helper()
	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	return httpx.DecodeJSON[decodeBody](r)
}

func TestDecodeJSON(t *testing.T) {
	t.Run("valid body", func(t *testing.T) {
		got, err := decode(t, `{"email":"alice@example.com"}`)
		if err != nil {
			t.Fatalf("got error %v, want nil", err)
		}
		if got.Email != "alice@example.com" {
			t.Fatalf("got %q, want %q", got.Email, "alice@example.com")
		}
	})

	t.Run("errors", func(t *testing.T) {
		cases := []struct {
			name string
			body string
			want string
		}{
			{"syntax", `{"email":}`, "malformed JSON at byte 10"},
			{"type mismatch", `{"email":123}`, `invalid type for field "email" (expected string)`},
			{"empty", ``, "request body must not be empty"},
			{"trailing object", `{"email":"a@b.com"}{}`, "request body must contain a single JSON object"},
			{"oversized", `{"email":"` + strings.Repeat("x", 2<<20) + `"}`, "request body too large"},

			// Go exposes no typed error for DisallowUnknownFields or for a
			// truncated document, so both land on the generic default.
			{"unknown field", `{"email":"a@b.com","admin":true}`, "invalid request body"},
			{"truncated", `{"email":`, "invalid request body"},
		}

		for _, tc := range cases {
			t.Run(tc.name, func(t *testing.T) {
				_, err := decode(t, tc.body)

				var e *httpx.Error
				if !errors.As(err, &e) {
					t.Fatalf("got %T (%v), want *httpx.Error", err, err)
				}
				if e.Status != http.StatusBadRequest {
					t.Errorf("status: got %d, want %d", e.Status, http.StatusBadRequest)
				}
				if e.Code != "bad_request" {
					t.Errorf("code: got %q, want %q", e.Code, "bad_request")
				}
				if e.Message != tc.want {
					t.Errorf("message: got %q, want %q", e.Message, tc.want)
				}
			})
		}
	})

	// The reason this package exists: a decoder error must never reach the
	// client verbatim, or a custom UnmarshalJSON echoing its input would ship
	// the user's PII in a 400.
	t.Run("never echoes the raw decoder error", func(t *testing.T) {
		_, err := decode(t, `{"email":"a@b.com","alice@example.com":1}`)

		var e *httpx.Error
		if !errors.As(err, &e) {
			t.Fatalf("got %T (%v), want *httpx.Error", err, err)
		}
		if strings.Contains(e.Message, "alice@example.com") {
			t.Fatalf("message %q echoes the offending input back to the client", e.Message)
		}
	})
}
