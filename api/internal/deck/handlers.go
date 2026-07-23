package deck

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"flashcardacademy/api/internal/card"
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
	Generate(ctx context.Context, text string) ([]card.Draft, error)
}

type Handlers struct {
	generator Generator
	store     *Store
}

func NewHandlers(generator Generator, store *Store) *Handlers {
	return &Handlers{generator: generator, store: store}
}

type cardResponse struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
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
		out = append(out, cardResponse{Question: c.Question, Answer: c.Answer})
	}
	httpx.WriteJSON(w, http.StatusOK, generateResponse{Cards: out})
}

const (
	maxDeckNameRunes  = 100
	maxCardFieldRunes = 2000
	// maxCardsPerDeck bounds one save. Generation caps well below this
	// (systemPrompt asks for 5–15); the ceiling is a guard against a crafted
	// request, not a product limit.
	maxCardsPerDeck = 200
)

type saveCardBody struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type saveDeckBody struct {
	ProfileID int64          `json:"profile_id"`
	Name      string         `json:"name"`
	Cards     []saveCardBody `json:"cards"`
}

type saveDeckResponse struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// Save persists a reviewed set of cards as a new deck under the parent's
// chosen profile. The profile is not trusted from the body alone: the store
// verifies it belongs to the caller, so a forged profile_id yields 404.
func (h *Handlers) Save(w http.ResponseWriter, r *http.Request) {
	u := user.FromContext(r.Context())
	body, err := httpx.DecodeJSON[saveDeckBody](r)
	if err != nil {
		httpx.WriteError(w, err)
		return
	}

	name := strings.TrimSpace(body.Name)
	if name == "" {
		httpx.WriteError(w, httpx.BadRequest("name is required"))
		return
	}
	if utf8.RuneCountInString(name) > maxDeckNameRunes {
		httpx.WriteError(w, httpx.BadRequest("name is too long"))
		return
	}
	if body.ProfileID <= 0 {
		httpx.WriteError(w, httpx.BadRequest("profile_id is required"))
		return
	}
	if len(body.Cards) == 0 {
		httpx.WriteError(w, httpx.BadRequest("at least one card is required"))
		return
	}
	if len(body.Cards) > maxCardsPerDeck {
		httpx.WriteError(w, httpx.BadRequest("too many cards"))
		return
	}

	drafts := make([]card.Draft, 0, len(body.Cards))
	for _, c := range body.Cards {
		q := strings.TrimSpace(c.Question)
		a := strings.TrimSpace(c.Answer)
		if q == "" || a == "" {
			httpx.WriteError(w, httpx.BadRequest("each card needs a question and an answer"))
			return
		}
		if utf8.RuneCountInString(q) > maxCardFieldRunes || utf8.RuneCountInString(a) > maxCardFieldRunes {
			httpx.WriteError(w, httpx.BadRequest("card text is too long"))
			return
		}
		drafts = append(drafts, card.Draft{Question: q, Answer: a})
	}

	d, err := h.store.Create(r.Context(), u.ID, body.ProfileID, name, drafts)
	if errors.Is(err, ErrProfileNotFound) {
		httpx.WriteError(w, httpx.NotFound("profile not found"))
		return
	}
	if err != nil {
		slog.ErrorContext(r.Context(), "save deck", "err", err, "user_id", u.ID)
		httpx.WriteError(w, httpx.InternalServer("failed to save deck"))
		return
	}

	slog.InfoContext(r.Context(), "deck saved",
		"user_id", u.ID, "profile_id", d.ProfileID, "deck_id", d.ID, "card_count", len(drafts))
	httpx.WriteJSON(w, http.StatusCreated, saveDeckResponse{ID: d.ID, Name: d.Name})
}
