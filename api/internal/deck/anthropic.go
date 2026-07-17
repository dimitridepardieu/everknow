package deck

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	anthropicEndpoint = "https://api.anthropic.com/v1/messages"
	anthropicVersion  = "2023-06-01"

	// Generation is low-volume and quality-critical — a capable model earns
	// its cost here. #44's answer check is the opposite shape (high volume,
	// a child waiting on it) and will want a faster tier.
	generateModel     = "claude-opus-4-8"
	generateMaxTokens = 16000

	// providerTimeout bounds a hung provider. A generation runs tens of
	// seconds, which is far past the server's default WriteTimeout — the
	// handler lifts that deadline to match.
	providerTimeout = 90 * time.Second
)

// systemPrompt ends by asking for JSON directly. We do NOT use the Messages
// API's structured-output mode (output_config.format): on opus-4-8 it
// degenerates on richer inputs — empty fields, repetition loops — where a
// plain "answer in this JSON shape" instruction is stable (verified against
// the live API, see #38 2026-07-17). We parse the text block ourselves and
// tolerate a stray markdown fence.
const systemPrompt = `Tu fabriques des flashcards de révision pour un enfant de 6 à 9 ans, à partir d'un texte fourni par son parent.

- Écris les cartes dans la langue du texte source.
- Une carte porte une seule idée. Si une réponse tient en deux faits, fais deux cartes.
- Les questions sont courtes et concrètes : l'enfant doit pouvoir y répondre à voix haute en une phrase.
- Les réponses sont exactes et tiennent en une phrase. Jamais de renvoi au texte ni de « voir plus haut ».
- Ne pose de question que sur ce qui est écrit dans le texte. N'invente rien, n'ajoute aucune connaissance extérieure.
- category nomme le thème en un ou deux mots (ex. « Astronomie »), le même pour les cartes d'un même thème.
- Produis entre 5 et 15 cartes selon la richesse du texte. Un texte pauvre donne peu de cartes : mieux vaut trois bonnes cartes que douze remplissages.

Réponds UNIQUEMENT avec un objet JSON de cette forme, sans aucun texte autour ni bloc de code markdown :
{"cards": [{"question": "...", "answer": "...", "category": "..."}]}`

// AnthropicGenerator calls the Messages API over plain net/http. The SDK
// would buy retries and typed structs, but we use one endpoint and the
// codebase already calls Resend this way — see issue #38, 2026-07-17.
type AnthropicGenerator struct {
	apiKey string
	client *http.Client
}

func NewAnthropicGenerator(apiKey string) *AnthropicGenerator {
	return &AnthropicGenerator{
		apiKey: apiKey,
		client: &http.Client{Timeout: providerTimeout},
	}
}

// anthropicResponse is the slice of the Messages API response we read.
type anthropicResponse struct {
	StopReason string `json:"stop_reason"`
	Content    []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
}

func (g *AnthropicGenerator) Generate(ctx context.Context, text string) ([]Card, error) {
	payload := map[string]any{
		"model":         generateModel,
		"max_tokens":    generateMaxTokens,
		"system":        systemPrompt,
		"output_config": map[string]any{"effort": "medium"},
		"messages":      []map[string]any{{"role": "user", "content": text}},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal anthropic payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, anthropicEndpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build anthropic request: %w", err)
	}
	req.Header.Set("x-api-key", g.apiKey)
	req.Header.Set("anthropic-version", anthropicVersion)
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("anthropic http: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		// Drain but never include the body: a 4xx can echo the request back,
		// and the request carries the parent's pasted text — free-form user
		// text is PII (CLAUDE.md), and this error ends up in slog.
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("anthropic status %d", resp.StatusCode)
	}

	var out anthropicResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode anthropic response: %w", err)
	}

	switch out.StopReason {
	case "max_tokens":
		// The JSON was cut mid-object; unmarshalling it below would fail with
		// a syntax error that hides the real cause.
		return nil, errors.New("anthropic: response truncated at max_tokens")
	case "refusal":
		return nil, errors.New("anthropic: request refused")
	}

	var raw string
	for _, b := range out.Content {
		if b.Type == "text" {
			raw = b.Text
			break
		}
	}
	if raw == "" {
		return nil, errors.New("anthropic: no text block in response")
	}

	var wire struct {
		Cards []struct {
			Question string `json:"question"`
			Answer   string `json:"answer"`
			Category string `json:"category"`
		} `json:"cards"`
	}
	if err := json.Unmarshal([]byte(raw), &wire); err != nil {
		return nil, fmt.Errorf("unmarshal generated cards: %w", err)
	}

	cards := make([]Card, 0, len(wire.Cards))
	for _, c := range wire.Cards {
		cards = append(cards, Card{Question: c.Question, Answer: c.Answer, Category: c.Category})
	}
	return cards, nil
}
