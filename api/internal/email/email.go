package email

import (
	"context"
	"fmt"

	"everknow/api/internal/config"
)

type Sender interface {
	SendMagicLink(ctx context.Context, to, link string) error
}

func New(cfg *config.Config) (Sender, error) {
	switch cfg.EmailProvider {
	case config.EmailProviderConsole:
		return NewConsoleSender(), nil
	case config.EmailProviderResend:
		return NewResendSender(cfg.ResendAPIKey, cfg.EmailFrom), nil
	default:
		return nil, fmt.Errorf("unsupported email provider: %s", cfg.EmailProvider)
	}
}
