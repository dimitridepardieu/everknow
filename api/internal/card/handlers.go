package card

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"everknow/api/internal/httpx"
	"everknow/api/internal/user"
)

type Handlers struct {
	store *Store
}

func NewHandlers(store *Store) *Handlers { return &Handlers{store: store} }

type dueCardResponse struct {
	ID       int64  `json:"id"`
	Question string `json:"question"`
	Answer   string `json:"answer"`
	Rank     Rank   `json:"rank"`
}

type dueResponse struct {
	Cards []dueCardResponse `json:"cards"`
}

// Due lists the cards a learner has to answer now. The answer travels with the
// question: a flashcard reveals it, and the child grades themselves against it.
func (h *Handlers) Due(w http.ResponseWriter, r *http.Request) {
	u := user.FromContext(r.Context())
	profileID, err := strconv.ParseInt(r.URL.Query().Get("profile_id"), 10, 64)
	if err != nil || profileID <= 0 {
		httpx.WriteError(w, httpx.BadRequest("profile_id is required"))
		return
	}

	cards, err := h.store.DueByProfile(r.Context(), u.ID, profileID)
	if err != nil {
		slog.ErrorContext(r.Context(), "list due cards", "err", err, "user_id", u.ID)
		httpx.WriteError(w, httpx.InternalServer("failed to load due cards"))
		return
	}

	out := make([]dueCardResponse, 0, len(cards))
	for _, c := range cards {
		out = append(out, dueCardResponse{
			ID: c.ID, Question: c.Question, Answer: c.Answer, Rank: c.Rank,
		})
	}
	httpx.WriteJSON(w, http.StatusOK, dueResponse{Cards: out})
}

type reviewBody struct {
	// A pointer so an absent field is rejected rather than silently read as
	// "wrong" — that would knock a card down a rank on a malformed request.
	Correct *bool `json:"correct"`
}

type reviewResponse struct {
	Rank  Rank       `json:"rank"`
	DueAt *time.Time `json:"due_at"`
}

// Review records how a card was answered and returns where it landed. A null
// due_at means the card is mastered and will not come back.
func (h *Handlers) Review(w http.ResponseWriter, r *http.Request) {
	u := user.FromContext(r.Context())
	cardID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || cardID <= 0 {
		httpx.WriteError(w, httpx.NotFound("card not found"))
		return
	}
	body, err := httpx.DecodeJSON[reviewBody](r)
	if err != nil {
		httpx.WriteError(w, err)
		return
	}
	if body.Correct == nil {
		httpx.WriteError(w, httpx.BadRequest("correct is required"))
		return
	}

	before, after, dueAt, err := h.store.Review(r.Context(), u.ID, cardID, *body.Correct)
	if errors.Is(err, ErrNotFound) {
		httpx.WriteError(w, httpx.NotFound("card not found"))
		return
	}
	if err != nil {
		slog.ErrorContext(r.Context(), "review card", "err", err, "user_id", u.ID)
		httpx.WriteError(w, httpx.InternalServer("failed to review card"))
		return
	}

	slog.InfoContext(r.Context(), "card reviewed",
		"user_id", u.ID, "card_id", cardID, "correct", *body.Correct,
		"rank_before", before, "rank_after", after)
	httpx.WriteJSON(w, http.StatusOK, reviewResponse{Rank: after, DueAt: dueAt})
}
