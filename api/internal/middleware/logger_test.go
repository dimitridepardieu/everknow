package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"flashcardacademy/api/internal/middleware"
)

// Logger wraps the ResponseWriter to record the status code. A wrapper that
// doesn't forward Unwrap hides every capability it doesn't reimplement, so
// http.ResponseController can't reach the real writer and SetWriteDeadline
// fails with "feature not supported" — silently, since the handler can only
// log it. Card generation lifts main.go's 15s WriteTimeout that way, so
// losing this would cut every generation off mid-flight in production.
func TestLogger_ResponseControllerReachesUnderlyingWriter(t *testing.T) {
	errs := make(chan error, 1)
	h := middleware.Logger(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		errs <- http.NewResponseController(w).SetWriteDeadline(time.Now().Add(time.Minute))
	}))
	srv := httptest.NewServer(h)
	defer srv.Close()

	resp, err := http.Get(srv.URL)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	resp.Body.Close()

	if err := <-errs; err != nil {
		t.Fatalf("SetWriteDeadline through Logger: %v (statusRecorder must implement Unwrap)", err)
	}
}
