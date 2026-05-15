package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"flashcardacademy/api/internal/auth"
	"flashcardacademy/api/internal/config"
	"flashcardacademy/api/internal/db"
	"flashcardacademy/api/internal/email"
	"flashcardacademy/api/internal/middleware"
	"flashcardacademy/api/internal/session"
	"flashcardacademy/api/internal/user"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		resp, err := http.Get("http://localhost:8080/api/health")
		if err != nil || resp.StatusCode != http.StatusOK {
			os.Exit(1)
		}
		os.Exit(0)
	}

	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	setupLogger(cfg)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("open db: %w", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		return fmt.Errorf("migrate db: %w", err)
	}

	sender, err := email.New(cfg)
	if err != nil {
		return fmt.Errorf("init email sender: %w", err)
	}

	verificationStore := auth.NewStore(pool)
	sessionStore := session.NewStore(pool)
	userStore := user.NewStore(pool)
	magic := auth.NewMagicLinkSender(verificationStore, sender, cfg.AppBaseURL, cfg.MagicLinkTTL)
	handlers := auth.NewHandlers(cfg, sessionStore, userStore, magic)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", health(pool))
	mux.HandleFunc("POST /api/auth/request", handlers.RequestMagicLink)
	mux.HandleFunc("GET /api/auth/verify", handlers.Verify)
	mux.Handle("POST /api/auth/logout", middleware.RequireUser(http.HandlerFunc(handlers.Logout)))
	mux.Handle("GET /api/me", middleware.RequireUser(http.HandlerFunc(handlers.Me)))
	mux.Handle("PATCH /api/me", middleware.RequireUser(http.HandlerFunc(handlers.UpdateMe)))

	// Order matters: Recover (outer) → Auth (inject user) → Logger (sees user) → mux.
	// Logger runs inside Auth so it can include user_id in the per-request log line.
	var handler http.Handler = mux
	handler = middleware.Logger(handler)
	handler = middleware.Auth(cfg.SessionCookieName, sessionStore, userStore)(handler)
	handler = middleware.Recover(handler)

	server := &http.Server{
		Addr:              cfg.APIAddr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		// ReadTimeout + WriteTimeout bound slow-loris and slow-write
		// attacks. Without them, a single attacker can park 25 (= pool
		// MaxOpenConns) goroutines indefinitely and starve the service.
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	serverErr := make(chan error, 1)
	go func() {
		slog.Info("api listening", "addr", cfg.APIAddr, "env", cfg.Env)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
		close(serverErr)
	}()

	select {
	case <-ctx.Done():
		slog.Info("shutdown signal received")
	case err := <-serverErr:
		if err != nil {
			return fmt.Errorf("server: %w", err)
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	slog.Info("api stopped")
	return nil
}

func setupLogger(cfg *config.Config) {
	opts := &slog.HandlerOptions{Level: slog.LevelInfo}
	var handler slog.Handler
	if cfg.IsDev() {
		handler = slog.NewTextHandler(os.Stdout, opts)
	} else {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	}
	slog.SetDefault(slog.New(handler))
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
