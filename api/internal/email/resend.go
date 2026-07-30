package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"time"
)

const resendEndpoint = "https://api.resend.com/emails"

type ResendSender struct {
	apiKey string
	from   string
	client *http.Client
}

func NewResendSender(apiKey, from string) *ResendSender {
	return &ResendSender{
		apiKey: apiKey,
		from:   from,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (s *ResendSender) SendMagicLink(ctx context.Context, to, link string) error {
	payload := map[string]any{
		"from":    s.from,
		"to":      []string{to},
		"subject": "Ton lien de connexion à Everknow",
		"html":    magicLinkHTML(link),
		"text":    magicLinkText(link),
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal resend payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, resendEndpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build resend request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("resend http: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		// Drain but don't include the body in the error: Resend's 4xx
		// responses can echo the recipient address, which would defeat
		// PII redaction once the error reaches slog (CLAUDE.md rule 11).
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("resend status %d", resp.StatusCode)
	}
	return nil
}

func magicLinkHTML(link string) string {
	// Escape defensively even though `link` is server-built today: a future
	// config change feeding any user-controlled value into the URL would
	// otherwise let HTML or javascript: payloads slip into the email body.
	safe := html.EscapeString(link)
	return fmt.Sprintf(`<p>Clique sur le lien ci-dessous pour te connecter à Everknow :</p>
<p><a href="%s">Me connecter</a></p>
<p>Ce lien expire dans 15 minutes. Si tu n'as pas fait cette demande, ignore cet email.</p>`, safe)
}

func magicLinkText(link string) string {
	return fmt.Sprintf(`Connecte-toi à Everknow :

%s

Ce lien expire dans 15 minutes. Si tu n'as pas fait cette demande, ignore cet email.`, link)
}
