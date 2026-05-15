package auth

import (
	"errors"
	"log/slog"
	"net"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"flashcardacademy/api/internal/config"
	"flashcardacademy/api/internal/httpx"
	"flashcardacademy/api/internal/httpx/middleware"
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

type requestMagicLinkRequest struct {
	Email string `json:"email"`
}

// POST /api/auth/request
func (h *Handlers) RequestMagicLink(w http.ResponseWriter, r *http.Request) {
	body, err := httpx.DecodeJSON[requestMagicLinkRequest](r)
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

// GET /api/auth/verify?token=...
func (h *Handlers) Verify(w http.ResponseWriter, r *http.Request) {
	rawToken := r.URL.Query().Get("token")
	if rawToken == "" {
		h.redirectWithError(w, r, "missing_token")
		return
	}

	identifier, err := h.magic.store.ConsumeByValue(r.Context(), token.Hash(rawToken))
	if err != nil {
		if !errors.Is(err, ErrVerificationNotFound) {
			slog.ErrorContext(r.Context(), "consume verification", "err", err)
		}
		h.redirectWithError(w, r, "invalid_or_expired_token")
		return
	}

	u, err := h.users.FindByEmail(r.Context(), identifier)
	isNewUser := false
	if errors.Is(err, user.ErrNotFound) {
		u, err = h.users.Create(r.Context(), identifier)
		isNewUser = true
	}
	if err != nil {
		slog.ErrorContext(r.Context(), "find/create user", "err", err)
		h.redirectWithError(w, r, "internal")
		return
	}
	if isNewUser {
		slog.InfoContext(r.Context(), "user created via magic link", "user_id", u.ID, "email", h.redactEmail(u.Email))
	}

	sessionToken, err := token.New()
	if err != nil {
		slog.ErrorContext(r.Context(), "new session token", "err", err)
		h.redirectWithError(w, r, "internal")
		return
	}
	ipAddr := extractClientIP(r)
	userAgent := r.Header.Get("User-Agent")
	if _, err := h.sessions.Create(r.Context(), u.ID, sessionToken,
		time.Now().Add(h.cfg.SessionTTL), ipAddr, &userAgent); err != nil {
		slog.ErrorContext(r.Context(), "create session", "err", err)
		h.redirectWithError(w, r, "internal")
		return
	}

	session.SetCookie(w, h.cfg.SessionCookieName, sessionToken, h.cfg.SessionTTL, true)
	slog.InfoContext(r.Context(), "session created", "user_id", u.ID, "new_user", isNewUser)

	target := "/learn"
	if u.Role == nil {
		target = "/onboarding"
	}
	http.Redirect(w, r, target, http.StatusSeeOther)
}

// POST /api/auth/logout
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

// GET /api/me
func (h *Handlers) Me(w http.ResponseWriter, r *http.Request) {
	u := middleware.UserFromContext(r.Context())
	httpx.WriteJSON(w, http.StatusOK, meResponse{
		ID: u.ID, Email: u.Email, Name: u.Name, Role: u.Role,
	})
}

type updateMeRequest struct {
	Role string `json:"role"`
}

// PATCH /api/me
func (h *Handlers) UpdateMe(w http.ResponseWriter, r *http.Request) {
	u := middleware.UserFromContext(r.Context())
	body, err := httpx.DecodeJSON[updateMeRequest](r)
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
	w.WriteHeader(http.StatusNoContent)
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
// the proxy's IP in our setup). Returns nil if no usable IP is found.
func extractClientIP(r *http.Request) *string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.IndexByte(xff, ','); i > 0 {
			xff = xff[:i]
		}
		xff = strings.TrimSpace(xff)
		if xff != "" {
			return &xff
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil || host == "" {
		return nil
	}
	return &host
}
