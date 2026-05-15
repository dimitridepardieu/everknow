package auth

import (
	"context"
	"fmt"
	"time"

	"flashcardacademy/api/internal/email"
	"flashcardacademy/api/internal/token"
)

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
	raw, err := token.New()
	if err != nil {
		return fmt.Errorf("generate token: %w", err)
	}
	expiresAt := time.Now().Add(m.ttl)
	if err := m.store.Create(ctx, recipientEmail, token.Hash(raw), expiresAt); err != nil {
		return err
	}
	link := fmt.Sprintf("%s/api/auth/verify?token=%s", m.appBaseURL, raw)
	return m.sender.SendMagicLink(ctx, recipientEmail, link)
}
