package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"everknow/api/internal/httpx"
)

func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.ErrorContext(r.Context(), "panic recovered",
					"panic", rec,
					"path", r.URL.Path,
					"method", r.Method,
					"stack", string(debug.Stack()),
				)
				httpx.WriteError(w, httpx.InternalServer("internal server error"))
			}
		}()
		next.ServeHTTP(w, r)
	})
}
