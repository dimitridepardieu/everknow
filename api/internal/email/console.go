package email

import (
	"context"
	"log/slog"
)

type ConsoleSender struct{}

func NewConsoleSender() *ConsoleSender { return &ConsoleSender{} }

func (s *ConsoleSender) SendMagicLink(ctx context.Context, to, link string) error {
	slog.InfoContext(ctx, "magic link (console provider)", "to", to, "link", link)
	return nil
}
