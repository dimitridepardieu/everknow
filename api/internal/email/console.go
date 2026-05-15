package email

import (
	"context"
	"log/slog"
)

type ConsoleSender struct{}

func NewConsoleSender() *ConsoleSender { return &ConsoleSender{} }

func (s *ConsoleSender) SendMagicLink(_ context.Context, to, link string) error {
	slog.Info("magic link (console provider)", "to", to, "link", link)
	return nil
}
