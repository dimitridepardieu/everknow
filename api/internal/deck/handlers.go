package deck

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"flashcardacademy/api/internal/httpx"
	"flashcardacademy/api/internal/user"
)

const (
	// minSourceRunes keeps "hello" from costing a real generation. Below a
	// sentence or two there is nothing to make cards from.
	minSourceRunes = 100
	maxSourceRunes = 5000

	// writeDeadline outlives providerTimeout so a hung provider trips its
	// own timeout and yields a real error, rather than the response being
	// cut off first.
	writeDeadline = providerTimeout + 10*time.Second
)

// Generator turns source text into flashcards. Declared on the consumer
// side: these handlers are the only caller, and the seam exists because
// integration tests must not reach the real provider.
type Generator interface {
	Generate(ctx context.Context, text string) ([]Card, error)
}

type Handlers struct {
	generator Generator
}

func NewHandlers(generator Generator) *Handlers {
	return &Handlers{generator: generator}
}

type cardResponse struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
	Category string `json:"category"`
}

type generateResponse struct {
	Cards []cardResponse `json:"cards"`
}

type generateBody struct {
	Text string `json:"text"`
}

func (h *Handlers) Generate(w http.ResponseWriter, r *http.Request) {
	u := user.FromContext(r.Context())
	body, err := httpx.DecodeJSON[generateBody](r)
	if err != nil {
		httpx.WriteError(w, err)
		return
	}
	text := strings.TrimSpace(body.Text)
	runes := utf8.RuneCountInString(text)
	if runes < minSourceRunes {
		httpx.WriteError(w, httpx.BadRequest("text is too short"))
		return
	}
	if runes > maxSourceRunes {
		httpx.WriteError(w, httpx.BadRequest("text is too long"))
		return
	}

	// main.go's 15s WriteTimeout is sized for ordinary handlers and would
	// cut a generation off mid-flight. Lift it for this response alone
	// rather than loosening the server-wide slow-write defense.
	if err := http.NewResponseController(w).SetWriteDeadline(time.Now().Add(writeDeadline)); err != nil {
		slog.WarnContext(r.Context(), "extend write deadline", "err", err)
	}

	cards, err := h.generator.Generate(r.Context(), text)
	if err != nil {
		slog.ErrorContext(r.Context(), "generate cards", "err", err, "user_id", u.ID)
		httpx.WriteError(w, httpx.InternalServer("failed to generate cards"))
		return
	}
	if len(cards) == 0 {
		httpx.WriteError(w, httpx.BadRequest("no cards could be generated from this text"))
		return
	}

	// Log the shape of the generation, never the text itself: what a parent
	// pastes is free-form user content, and free-form user content is PII.
	slog.InfoContext(r.Context(), "cards generated",
		"user_id", u.ID, "card_count", len(cards), "source_runes", runes)

	out := make([]cardResponse, 0, len(cards))
	for _, c := range cards {
		out = append(out, cardResponse{Question: c.Question, Answer: c.Answer, Category: c.Category})
	}
	httpx.WriteJSON(w, http.StatusOK, generateResponse{Cards: out})
}
