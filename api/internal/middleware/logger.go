package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"time"

	"everknow/api/internal/user"
)

// requestIDKey is a distinct unexported type to prevent collisions with
// other packages writing to the request context.
type requestIDKey struct{}

const requestIDHeader = "X-Request-ID"

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get(requestIDHeader)
		if reqID == "" {
			reqID = newRequestID()
		}
		w.Header().Set(requestIDHeader, reqID)

		ctx := context.WithValue(r.Context(), requestIDKey{}, reqID)
		r = r.WithContext(ctx)

		start := time.Now()
		rw := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rw, r)

		attrs := []any{
			"request_id", reqID,
			"method", r.Method,
			"path", r.URL.Path,
			"status", rw.status,
			"duration_ms", time.Since(start).Milliseconds(),
		}
		if u := user.FromContext(r.Context()); u != nil {
			attrs = append(attrs, "user_id", u.ID)
		}
		slog.InfoContext(ctx, "http request", attrs...)
	})
}

func newRequestID() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

type statusRecorder struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (s *statusRecorder) WriteHeader(code int) {
	if s.wroteHeader {
		return
	}
	s.status = code
	s.wroteHeader = true
	s.ResponseWriter.WriteHeader(code)
}

// Unwrap lets http.ResponseController reach the underlying writer through
// this wrapper — without it, the wrapper hides capabilities it doesn't
// implement itself and SetWriteDeadline fails with "feature not supported"
// (see net/http's ResponseController docs). Card generation depends on it:
// it lifts main.go's 15s WriteTimeout for its own long response.
func (s *statusRecorder) Unwrap() http.ResponseWriter { return s.ResponseWriter }
