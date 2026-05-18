// Package server wires HTTP routes and middleware. Extracted from main so
// tests (apitest.Env) can mount the exact same stack and stay in sync with
// production wiring automatically.
package server

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"flashcardacademy/api/internal/auth"
	"flashcardacademy/api/internal/config"
	"flashcardacademy/api/internal/middleware"
	"flashcardacademy/api/internal/session"
	"flashcardacademy/api/internal/user"
)

type Deps struct {
	Cfg      *config.Config
	Pool     *sql.DB
	Sessions *session.Store
	Users    *user.Store
	Magic    *auth.MagicLinkSender
}

func NewHandler(d Deps) http.Handler {
	handlers := auth.NewHandlers(d.Cfg, d.Sessions, d.Users, d.Magic)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", health(d.Pool))
	mux.HandleFunc("POST /api/auth/request", handlers.RequestMagicLink)
	mux.HandleFunc("GET /api/auth/verify", handlers.Verify)
	mux.Handle("POST /api/auth/logout", middleware.RequireUser(http.HandlerFunc(handlers.Logout)))
	mux.Handle("GET /api/me", middleware.RequireUser(http.HandlerFunc(handlers.Me)))
	mux.Handle("PATCH /api/me", middleware.RequireUser(http.HandlerFunc(handlers.UpdateMe)))

	// Order matters: Recover (outer) → Auth (inject user) → Logger (sees user) → mux.
	// Logger runs inside Auth so it can include user_id in the per-request log line.
	var h http.Handler = mux
	h = middleware.Logger(h)
	h = middleware.Auth(d.Cfg.SessionCookieName, d.Sessions, d.Users)(h)
	h = middleware.Recover(h)
	return h
}

// health returns 503 when the database is unreachable so the orchestrator's
// liveness check picks up DB outages rather than letting traffic hit a
// silently-broken instance.
func health(pool *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := pool.PingContext(ctx); err != nil {
			http.Error(w, "db unreachable", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "ok")
	}
}
