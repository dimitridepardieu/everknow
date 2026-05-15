package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"

	"flashcardacademy/api/internal/email"
)

// GenerateToken returns a 32-byte cryptographically random token,
// base64url-encoded (43 chars, URL-safe, no padding). 256 bits of entropy.
func GenerateToken() (string, error) {
	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", fmt.Errorf("read rand: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b[:]), nil
}

// HashToken returns the sha256 of a magic-link token. Only the hash is
// stored in DB; the raw token only ever exists in the user's inbox.
func HashToken(token string) []byte {
	h := sha256.Sum256([]byte(token))
	return h[:]
}

type MagicLinkSender struct {
	store      *VerificationStore
	sender     email.Sender
	appBaseURL string
	ttl        time.Duration
}

func NewMagicLinkSender(store *VerificationStore, sender email.Sender, appBaseURL string, ttl time.Duration) *MagicLinkSender {
	return &MagicLinkSender{
		store:      store,
		sender:     sender,
		appBaseURL: appBaseURL,
		ttl:        ttl,
	}
}

// Request generates a fresh magic link, stores its hashed value, and emails
// the raw token to the recipient.
func (m *MagicLinkSender) Request(ctx context.Context, recipientEmail string) error {
	token, err := GenerateToken()
	if err != nil {
		return fmt.Errorf("generate token: %w", err)
	}
	expiresAt := time.Now().Add(m.ttl)
	if err := m.store.Create(ctx, recipientEmail, HashToken(token), expiresAt); err != nil {
		return err
	}
	link := fmt.Sprintf("%s/api/auth/verify?token=%s", m.appBaseURL, token)
	return m.sender.SendMagicLink(ctx, recipientEmail, link)
}
