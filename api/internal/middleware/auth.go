package middleware

import (
	"errors"
	"log/slog"
	"net/http"

	"everknow/api/internal/httpx"
	"everknow/api/internal/session"
	"everknow/api/internal/user"
)

// Auth returns a middleware that loads the user owning the session cookie
// (if any) and injects them into the request context. Anonymous requests
// pass through; use RequireUser to enforce auth on a route.
func Auth(sessions *session.Store, users *user.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := session.ReadCookie(r)
			if token == "" {
				next.ServeHTTP(w, r)
				return
			}
			sess, err := sessions.GetByToken(r.Context(), token)
			if err != nil {
				if errors.Is(err, session.ErrNotFound) {
					session.ClearCookie(w)
				} else {
					slog.WarnContext(r.Context(), "session lookup failed", "err", err)
				}
				next.ServeHTTP(w, r)
				return
			}
			u, err := users.FindByID(r.Context(), sess.UserID)
			if err != nil {
				if errors.Is(err, user.ErrNotFound) {
					session.ClearCookie(w)
				} else {
					slog.WarnContext(r.Context(), "user lookup failed", "err", err)
				}
				next.ServeHTTP(w, r)
				return
			}
			next.ServeHTTP(w, r.WithContext(user.NewContext(r.Context(), u)))
		})
	}
}

func RequireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if user.FromContext(r.Context()) == nil {
			httpx.WriteError(w, httpx.Unauthorized("authentication required"))
			return
		}
		next.ServeHTTP(w, r)
	})
}
