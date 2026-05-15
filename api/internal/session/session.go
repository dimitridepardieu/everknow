package session

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"time"
)

type Session struct {
	ID        int64
	UserID    int64
	Token     string
	ExpiresAt time.Time
	IPAddress *string
	UserAgent *string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// NewToken returns a 32-byte cryptographically random token, base64url-encoded
// (43 chars, no padding). Suitable for use as a session cookie value.
func NewToken() (string, error) {
	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b[:]), nil
}

func SetCookie(w http.ResponseWriter, name, token string, ttl time.Duration, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(ttl),
		MaxAge:   int(ttl.Seconds()),
	})
}

func ClearCookie(w http.ResponseWriter, name string, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})
}

func ReadCookie(r *http.Request, name string) string {
	c, err := r.Cookie(name)
	if err != nil {
		return ""
	}
	return c.Value
}
