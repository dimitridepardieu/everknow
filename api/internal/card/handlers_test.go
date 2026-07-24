package card_test

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"flashcardacademy/api/internal/apitest"
	"flashcardacademy/api/internal/card"
)

func createProfile(t *testing.T, env *apitest.Env, name string) int64 {
	t.Helper()
	resp := env.Client.PostJSON(t, "/api/profiles", map[string]any{"name": name})
	if resp.StatusCode != http.StatusCreated {
		resp.Body.Close()
		t.Fatalf("create profile: got %d want 201", resp.StatusCode)
	}
	var p struct {
		ID int64 `json:"id"`
	}
	apitest.DecodeJSON(t, resp, &p)
	return p.ID
}

// saveDeck files two cards under profileID and returns the deck's id. Saving a
// deck is the only way cards come into being today, so it is how these tests
// get a card to schedule.
func saveDeck(t *testing.T, env *apitest.Env, profileID int64) int64 {
	t.Helper()
	resp := env.Client.PostJSON(t, "/api/decks", map[string]any{
		"profile_id": profileID,
		"name":       "Système solaire",
		"cards": []map[string]string{
			{"question": "Combien de planètes ?", "answer": "Huit."},
			{"question": "La plus grosse ?", "answer": "Jupiter."},
		},
	})
	if resp.StatusCode != http.StatusCreated {
		resp.Body.Close()
		t.Fatalf("save deck: got %d want 201", resp.StatusCode)
	}
	var d struct {
		ID int64 `json:"id"`
	}
	apitest.DecodeJSON(t, resp, &d)
	return d.ID
}

type dueCardJSON struct {
	ID       int64     `json:"id"`
	Question string    `json:"question"`
	Answer   string    `json:"answer"`
	Rank     card.Rank `json:"rank"`
}

func due(t *testing.T, env *apitest.Env, profileID int64) []dueCardJSON {
	t.Helper()
	resp := env.Client.Get(t, fmt.Sprintf("/api/cards/due?profile_id=%d", profileID))
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		t.Fatalf("due cards: got %d want 200", resp.StatusCode)
	}
	var body struct {
		Cards []dueCardJSON `json:"cards"`
	}
	apitest.DecodeJSON(t, resp, &body)
	return body.Cards
}

type reviewJSON struct {
	Rank  card.Rank  `json:"rank"`
	DueAt *time.Time `json:"due_at"`
}

func review(t *testing.T, env *apitest.Env, cardID int64, correct bool) reviewJSON {
	t.Helper()
	resp := env.Client.PostJSON(t,
		fmt.Sprintf("/api/cards/%d/review", cardID), map[string]any{"correct": correct})
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		t.Fatalf("review: got %d want 200", resp.StatusCode)
	}
	var body reviewJSON
	apitest.DecodeJSON(t, resp, &body)
	return body
}

// ─── Due ────────────────────────────────────────────────────────

func TestDue_RequiresAuth(t *testing.T) {
	env := apitest.New(t)

	resp := env.Client.Get(t, "/api/cards/due?profile_id=1")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status: got %d want 401", resp.StatusCode)
	}
}

func TestDue_MissingProfile_IsBadRequest(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "parent@example.test")

	resp := env.Client.Get(t, "/api/cards/due")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status: got %d want 400", resp.StatusCode)
	}
}

// A card is due the moment it is saved: the child can train on a deck the day
// they make it, rather than waiting a day for the schedule to start.
func TestDue_NewCardsAreDueImmediately(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "parent@example.test")
	profileID := createProfile(t, env, "Léo")
	saveDeck(t, env, profileID)

	cards := due(t, env, profileID)
	if len(cards) != 2 {
		t.Fatalf("due cards: got %d want 2", len(cards))
	}
	if cards[0].Rank != card.RankNew {
		t.Errorf("rank: got %d want %d", cards[0].Rank, card.RankNew)
	}
	// The answer travels with the question — the child reveals it and grades
	// themselves against it.
	if cards[0].Question == "" || cards[0].Answer == "" {
		t.Errorf("card content: got %+v", cards[0])
	}
}

func TestDue_ForeignProfile_IsEmpty(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "owner@example.test")
	profileID := createProfile(t, env, "Léo")
	saveDeck(t, env, profileID)

	// Same browser client, different account: it now acts as the intruder.
	env.Login(t, "intruder@example.test")
	// Empty rather than 404: whether that profile exists is not the
	// intruder's business.
	if cards := due(t, env, profileID); len(cards) != 0 {
		t.Fatalf("due cards for a foreign profile: got %d want 0", len(cards))
	}
}

// ─── Review ─────────────────────────────────────────────────────

func TestReview_RequiresAuth(t *testing.T) {
	env := apitest.New(t)

	resp := env.Client.PostJSON(t, "/api/cards/1/review", map[string]any{"correct": true})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status: got %d want 401", resp.StatusCode)
	}
}

func TestReview_CorrectAnswerClimbsAndPostponesTheCard(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "parent@example.test")
	profileID := createProfile(t, env, "Léo")
	saveDeck(t, env, profileID)
	first := due(t, env, profileID)[0]

	got := review(t, env, first.ID, true)
	if got.Rank != 2 {
		t.Fatalf("rank: got %d want 2", got.Rank)
	}
	// On the daily grid: due in the future, at the day-start hour — the exact
	// day count is pinned by the pure schedule tests.
	if got.DueAt == nil || !got.DueAt.After(time.Now()) || parisHour(t, *got.DueAt) != 6 {
		t.Fatalf("due date: got %v want a future 6am", got.DueAt)
	}

	// And it leaves today's pile, which is the whole point.
	remaining := due(t, env, profileID)
	if len(remaining) != 1 {
		t.Fatalf("still due: got %d want 1", len(remaining))
	}
	if remaining[0].ID == first.ID {
		t.Fatal("the answered card is still due today")
	}
}

func TestReview_WrongAnswerAtTheBottomComesBackTomorrow(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "parent@example.test")
	profileID := createProfile(t, env, "Léo")
	saveDeck(t, env, profileID)
	first := due(t, env, profileID)[0]

	got := review(t, env, first.ID, false)
	if got.Rank != card.RankNew {
		t.Fatalf("rank: got %d want %d", got.Rank, card.RankNew)
	}
	// Tomorrow morning, not again in this session — a child who blocks on a
	// card should not be handed it in a loop. It leaves today's pile (checked
	// below) and lands on the next day's grid slot.
	if got.DueAt == nil || !got.DueAt.After(time.Now()) || parisHour(t, *got.DueAt) != 6 {
		t.Fatalf("due date: got %v want a future 6am", got.DueAt)
	}
	if len(due(t, env, profileID)) != 1 {
		t.Fatal("the missed card is still due today")
	}
}

// parisHour is the hour a due date falls on in the family's timezone. Due dates
// snap to a daily grid at 6am Europe/Paris (card.Schedule), so every review
// result should report hour 6 there whatever the wall clock reads.
func parisHour(t *testing.T, due time.Time) int {
	t.Helper()
	loc, err := time.LoadLocation("Europe/Paris")
	if err != nil {
		t.Fatalf("load Europe/Paris: %v", err)
	}
	return due.In(loc).Hour()
}

func TestReview_EnoughCorrectAnswersMasterTheCardForGood(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "parent@example.test")
	profileID := createProfile(t, env, "Léo")
	saveDeck(t, env, profileID)
	first := due(t, env, profileID)[0]

	var got reviewJSON
	for range card.RankMastered - card.RankNew {
		got = review(t, env, first.ID, true)
	}
	if got.Rank != card.RankMastered {
		t.Fatalf("rank: got %d want %d", got.Rank, card.RankMastered)
	}
	if got.DueAt != nil {
		t.Fatalf("due date: got %v want null (a mastered card never comes back)", got.DueAt)
	}

	// Mastered is terminal: even a wrong answer leaves it there.
	if after := review(t, env, first.ID, false); after.Rank != card.RankMastered || after.DueAt != nil {
		t.Fatalf("after a miss: got rank %d due %v, want %d and null", after.Rank, after.DueAt, card.RankMastered)
	}
}

func TestReview_ForeignCard_IsNotFoundAndChangesNothing(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "owner@example.test")
	profileID := createProfile(t, env, "Léo")
	saveDeck(t, env, profileID)
	victim := due(t, env, profileID)[0]

	env.Login(t, "intruder@example.test")
	resp := env.Client.PostJSON(t,
		fmt.Sprintf("/api/cards/%d/review", victim.ID), map[string]any{"correct": true})
	resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status: got %d want 404", resp.StatusCode)
	}

	var rank card.Rank
	if err := env.DB.QueryRow(`SELECT rank FROM cards WHERE id = $1`, victim.ID).Scan(&rank); err != nil {
		t.Fatalf("load card: %v", err)
	}
	if rank != card.RankNew {
		t.Fatalf("rank after an intruder's review: got %d want %d", rank, card.RankNew)
	}
}

// An absent "correct" must not read as false: that would knock a card down a
// rank on a malformed request.
func TestReview_MissingVerdict_IsBadRequest(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "parent@example.test")
	profileID := createProfile(t, env, "Léo")
	saveDeck(t, env, profileID)
	first := due(t, env, profileID)[0]

	resp := env.Client.PostJSON(t, fmt.Sprintf("/api/cards/%d/review", first.ID), map[string]any{})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status: got %d want 400", resp.StatusCode)
	}
}

// ─── Independence from decks ────────────────────────────────────

// Deleting a deck drops the name, not the child's work: the cards survive with
// no deck, keep their schedule, and stay due.
func TestCardsOutliveTheirDeck(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "parent@example.test")
	profileID := createProfile(t, env, "Léo")
	deckID := saveDeck(t, env, profileID)
	first := due(t, env, profileID)[0]
	review(t, env, first.ID, true)

	// Nothing deletes a deck through the API yet, so go at the table directly.
	if _, err := env.DB.Exec(`DELETE FROM decks WHERE id = $1`, deckID); err != nil {
		t.Fatalf("delete deck: %v", err)
	}

	var count int
	if err := env.DB.QueryRow(
		`SELECT count(*) FROM cards WHERE profile_id = $1 AND deck_id IS NULL`, profileID,
	).Scan(&count); err != nil {
		t.Fatalf("count orphaned cards: %v", err)
	}
	if count != 2 {
		t.Fatalf("cards surviving the deck: got %d want 2", count)
	}

	var rank card.Rank
	if err := env.DB.QueryRow(`SELECT rank FROM cards WHERE id = $1`, first.ID).Scan(&rank); err != nil {
		t.Fatalf("load card: %v", err)
	}
	if rank != 2 {
		t.Fatalf("rank after the deck was deleted: got %d want 2", rank)
	}
	if len(due(t, env, profileID)) != 1 {
		t.Fatal("a card without a deck stopped being due")
	}
}
