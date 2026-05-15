package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"flashcardacademy/api/internal/config"
	"flashcardacademy/api/internal/httpx"
	"flashcardacademy/api/internal/middleware"
	"flashcardacademy/api/internal/session"
	"flashcardacademy/api/internal/token"
	"flashcardacademy/api/internal/user"
)

type Handlers struct {
	cfg      *config.Config
	sessions *session.Store
	users    *user.Store
	magic    *MagicLinkSender
}

func NewHandlers(cfg *config.Config, sessions *session.Store, users *user.Store, magic *MagicLinkSender) *Handlers {
	return &Handlers{cfg: cfg, sessions: sessions, users: users, magic: magic}
}

type requestMagicLinkBody struct {
	Email string `json:"email"`
}

func (h *Handlers) RequestMagicLink(w http.ResponseWriter, r *http.Request) {
	body, err := httpx.DecodeJSON[requestMagicLinkBody](r)
	if err != nil {
		httpx.WriteError(w, err)
		return
	}
	em := strings.TrimSpace(strings.ToLower(body.Email))
	if _, err := mail.ParseAddress(em); err != nil {
		httpx.WriteError(w, httpx.BadRequest("invalid email"))
		return
	}

	// TODO: rate-limit per email + per IP to prevent magic-link spam.
	if err := h.magic.Request(r.Context(), em); err != nil {
		slog.ErrorContext(r.Context(), "magic link request failed", "err", err, "email", h.redactEmail(em))
		// Intentionally swallow the error: never reveal failure to the client
		// to prevent email-enumeration probes.
	} else {
		slog.InfoContext(r.Context(), "magic link sent", "email", h.redactEmail(em))
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}

func (h *Handlers) Verify(w http.ResponseWriter, r *http.Request) {
	rawToken := r.URL.Query().Get("token")
	if rawToken == "" {
		h.redirectWithError(w, r, "missing_token")
		return
	}

	identifier, err := h.magic.store.ConsumeByTokenHash(r.Context(), token.Hash(rawToken))
	if err != nil {
		if !errors.Is(err, ErrNotFound) {
			slog.ErrorContext(r.Context(), "consume verification", "err", err)
		}
		h.redirectWithError(w, r, "invalid_or_expired_token")
		return
	}

	u, err := h.users.FindByEmail(r.Context(), identifier)
	isNewUser := false
	if errors.Is(err, user.ErrNotFound) {
		u, err = h.users.Create(r.Context(), identifier)
		if err == nil {
			isNewUser = true
			slog.InfoContext(r.Context(), "user created via magic link", "user_id", u.ID, "email", h.redactEmail(u.Email))
		}
	}
	if err != nil {
		slog.ErrorContext(r.Context(), "find/create user", "err", err)
		h.redirectWithError(w, r, "internal")
		return
	}

	if err := h.issueSession(r.Context(), w, r, u); err != nil {
		slog.ErrorContext(r.Context(), "issue session", "err", err)
		h.redirectWithError(w, r, "internal")
		return
	}
	slog.InfoContext(r.Context(), "session created", "user_id", u.ID, "new_user", isNewUser)

	target := "/learn"
	if u.Role == nil {
		target = "/onboarding"
	}
	http.Redirect(w, r, target, http.StatusSeeOther)
}

func (h *Handlers) Logout(w http.ResponseWriter, r *http.Request) {
	u := middleware.UserFromContext(r.Context())
	if token := session.ReadCookie(r, h.cfg.SessionCookieName); token != "" {
		if err := h.sessions.DeleteByToken(r.Context(), token); err != nil {
			slog.WarnContext(r.Context(), "delete session", "err", err)
		}
	}
	session.ClearCookie(w, h.cfg.SessionCookieName, true)
	if u != nil {
		slog.InfoContext(r.Context(), "user logged out", "user_id", u.ID)
	}
	w.WriteHeader(http.StatusNoContent)
}

type meResponse struct {
	ID    int64   `json:"id"`
	Email string  `json:"email"`
	Name  *string `json:"name"`
	Role  *string `json:"role"`
}

func (h *Handlers) Me(w http.ResponseWriter, r *http.Request) {
	u := middleware.UserFromContext(r.Context())
	httpx.WriteJSON(w, http.StatusOK, meResponse{
		ID: u.ID, Email: u.Email, Name: u.Name, Role: u.Role,
	})
}

type updateMeBody struct {
	Role string `json:"role"`
}

func (h *Handlers) UpdateMe(w http.ResponseWriter, r *http.Request) {
	u := middleware.UserFromContext(r.Context())
	body, err := httpx.DecodeJSON[updateMeBody](r)
	if err != nil {
		httpx.WriteError(w, err)
		return
	}
	if !user.IsValidRole(body.Role) {
		httpx.WriteError(w, httpx.BadRequest("invalid role (expected 'parent' or 'student')"))
		return
	}
	oldRole := "<nil>"
	if u.Role != nil {
		oldRole = *u.Role
	}
	if err := h.users.UpdateRole(r.Context(), u.ID, body.Role); err != nil {
		slog.ErrorContext(r.Context(), "update role", "err", err)
		httpx.WriteError(w, httpx.InternalServer("failed to update role"))
		return
	}
	slog.InfoContext(r.Context(), "user role updated", "user_id", u.ID, "from", oldRole, "to", body.Role)

	// Rotate the session: a privilege change is sensitive, so any token
	// possibly leaked before this point becomes useless. Best-effort delete
	// of the old session — failing here would still leave the new session
	// valid, so we only warn.
	if oldToken := session.ReadCookie(r, h.cfg.SessionCookieName); oldToken != "" {
		if err := h.sessions.DeleteByToken(r.Context(), oldToken); err != nil {
			slog.WarnContext(r.Context(), "delete old session on rotation", "err", err)
		}
	}
	if err := h.issueSession(r.Context(), w, r, u); err != nil {
		slog.ErrorContext(r.Context(), "issue rotated session", "err", err)
		httpx.WriteError(w, httpx.InternalServer("session rotation failed"))
		return
	}
	slog.InfoContext(r.Context(), "session rotated", "user_id", u.ID)

	w.WriteHeader(http.StatusNoContent)
}

// issueSession creates a fresh DB session for u and sets the session cookie
// on w. Caller must invalidate any prior session beforehand if rotation is
// the intent.
func (h *Handlers) issueSession(ctx context.Context, w http.ResponseWriter, r *http.Request, u *user.User) error {
	raw, err := token.New()
	if err != nil {
		return fmt.Errorf("new session token: %w", err)
	}
	ipAddr := extractClientIP(r)
	userAgent := r.Header.Get("User-Agent")
	if err := h.sessions.Create(ctx, u.ID, raw, time.Now().Add(h.cfg.SessionTTL), ipAddr, &userAgent); err != nil {
		return err
	}
	session.SetCookie(w, h.cfg.SessionCookieName, raw, h.cfg.SessionTTL, true)
	return nil
}

func (h *Handlers) redirectWithError(w http.ResponseWriter, r *http.Request, code string) {
	http.Redirect(w, r, "/login?error="+code, http.StatusSeeOther)
}

// redactEmail returns the address as-is in dev (debugging convenience) and a
// masked form in prod ("d***@gmail.com"). Email is PII under GDPR Art. 4 and
// must be minimised in logs that may be retained beyond the request lifecycle.
func (h *Handlers) redactEmail(email string) string {
	if h.cfg.IsDev() {
		return email
	}
	at := strings.IndexByte(email, '@')
	if at <= 1 {
		return "***"
	}
	return email[:1] + "***" + email[at:]
}

// extractClientIP returns the client's IP without the port, preferring
// X-Forwarded-For (set by Caddy in front of us) over RemoteAddr (which is
// the proxy's IP in our setup). Returns nil when no parseable IP is found
// — sessions.ip_address is `inet` and rejects any non-IP string at INSERT.
func extractClientIP(r *http.Request) *string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.IndexByte(xff, ','); i > 0 {
			xff = xff[:i]
		}
		xff = strings.TrimSpace(xff)
		if net.ParseIP(xff) != nil {
			return &xff
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil || net.ParseIP(host) == nil {
		return nil
	}
	return &host
}
