package deck_test

import (
	"errors"
	"net/http"
	"strings"
	"testing"

	"flashcardacademy/api/internal/apitest"
	"flashcardacademy/api/internal/deck"
)

// sourceText is a synthetic passage comfortably over minSourceRunes; any
// equivalent text would do.
const sourceText = "Le système solaire est composé du Soleil, de huit planètes et d'objets divers. " +
	"Les planètes telluriques sont Mercure, Vénus, la Terre et Mars. Les géantes gazeuses " +
	"sont Jupiter et Saturne, et les géantes de glace Uranus et Neptune."

type cardJSON struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type generateJSON struct {
	Cards []cardJSON `json:"cards"`
}

func login(t *testing.T, env *apitest.Env, email string) {
	t.Helper()
	env.RequestAndConsumeMagicLink(t, email).Body.Close()
}

func TestGenerate_RequiresAuth(t *testing.T) {
	env := apitest.New(t)

	resp := env.Client.PostJSON(t, "/api/cards/generate", map[string]any{"text": sourceText})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status: got %d want 401", resp.StatusCode)
	}
	if env.Cards.Count() != 0 {
		t.Fatalf("generator calls: got %d want 0 (an anonymous request must not reach the provider)", env.Cards.Count())
	}
}

func TestGenerate_ReturnsCards(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")
	env.Cards.Cards = []deck.Card{
		{Question: "Combien de planètes ?", Answer: "Huit."},
		{Question: "Quelle est la plus grosse ?", Answer: "Jupiter."},
	}

	resp := env.Client.PostJSON(t, "/api/cards/generate", map[string]any{"text": sourceText})
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		t.Fatalf("status: got %d want 200", resp.StatusCode)
	}
	var got generateJSON
	apitest.DecodeJSON(t, resp, &got)

	if len(got.Cards) != 2 {
		t.Fatalf("card count: got %d want 2", len(got.Cards))
	}
	if got.Cards[0].Question != "Combien de planètes ?" {
		t.Fatalf("question: got %q", got.Cards[0].Question)
	}
	if got.Cards[0].Answer != "Huit." {
		t.Fatalf("answer: got %q", got.Cards[0].Answer)
	}
}

func TestGenerate_TrimsTextBeforeCallingProvider(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")

	env.Client.PostJSON(t, "/api/cards/generate",
		map[string]any{"text": "\n\t  " + sourceText + "  \n"}).Body.Close()

	if got := env.Cards.LastText(); got != sourceText {
		t.Fatalf("provider received untrimmed text: got %q", got)
	}
}

func TestGenerate_ShortText_RejectedWithoutCallingProvider(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")

	resp := env.Client.PostJSON(t, "/api/cards/generate", map[string]any{"text": "Bonjour."})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status: got %d want 400", resp.StatusCode)
	}
	// The point of the floor is cost: a generation that cannot work should
	// never reach a paid provider.
	if env.Cards.Count() != 0 {
		t.Fatalf("generator calls: got %d want 0", env.Cards.Count())
	}
}

func TestGenerate_LongText_RejectedWithoutCallingProvider(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")

	resp := env.Client.PostJSON(t, "/api/cards/generate",
		map[string]any{"text": strings.Repeat("é", 5001)})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status: got %d want 400", resp.StatusCode)
	}
	if env.Cards.Count() != 0 {
		t.Fatalf("generator calls: got %d want 0", env.Cards.Count())
	}
}

// The ceiling counts runes, not bytes: 5000 accented characters are 10000
// bytes, and a byte-based limit would reject valid French text.
func TestGenerate_MultibyteTextAtCeiling_Accepted(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")

	resp := env.Client.PostJSON(t, "/api/cards/generate",
		map[string]any{"text": strings.Repeat("é", 5000)})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status: got %d want 200", resp.StatusCode)
	}
}

func TestGenerate_ProviderError_IsOpaqueToClient(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")
	env.Cards.Err = errors.New("anthropic status 529")

	resp := env.Client.PostJSON(t, "/api/cards/generate", map[string]any{"text": sourceText})
	if resp.StatusCode != http.StatusInternalServerError {
		resp.Body.Close()
		t.Fatalf("status: got %d want 500", resp.StatusCode)
	}
	var body struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	}
	apitest.DecodeJSON(t, resp, &body)
	if strings.Contains(body.Message, "anthropic") {
		t.Fatalf("provider detail leaked to client: %q", body.Message)
	}
}

func TestGenerate_NoCardsProduced_IsBadRequest(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")
	env.Cards.Cards = []deck.Card{}

	resp := env.Client.PostJSON(t, "/api/cards/generate", map[string]any{"text": sourceText})
	defer resp.Body.Close()
	// The text, not the server, is what failed — the parent can fix it by
	// pasting something richer.
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status: got %d want 400", resp.StatusCode)
	}
}

// ─── Save ───────────────────────────────────────────────────────

// createProfile makes a child profile for the currently-logged-in client and
// returns its id, so save tests have a valid owner to file cards under.
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

func TestSave_RequiresAuth(t *testing.T) {
	env := apitest.New(t)

	resp := env.Client.PostJSON(t, "/api/decks", map[string]any{
		"profile_id": 1,
		"name":       "x",
		"cards":      []map[string]string{{"question": "q", "answer": "a"}},
	})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status: got %d want 401", resp.StatusCode)
	}
}

func TestSave_PersistsDeckAndCards(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")
	profileID := createProfile(t, env, "Léo")

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
		t.Fatalf("status: got %d want 201", resp.StatusCode)
	}
	var saved struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
	}
	apitest.DecodeJSON(t, resp, &saved)
	if saved.ID == 0 || saved.Name != "Système solaire" {
		t.Fatalf("response: got %+v", saved)
	}

	// The deck hangs off the profile...
	var gotProfile int64
	var gotName string
	if err := env.DB.QueryRow(`SELECT profile_id, name FROM decks WHERE id = $1`, saved.ID).
		Scan(&gotProfile, &gotName); err != nil {
		t.Fatalf("load deck: %v", err)
	}
	if gotProfile != profileID || gotName != "Système solaire" {
		t.Fatalf("deck row: profile=%d name=%q", gotProfile, gotName)
	}
	// ...and carries exactly the kept cards.
	var cardCount int
	if err := env.DB.QueryRow(`SELECT count(*) FROM cards WHERE deck_id = $1`, saved.ID).
		Scan(&cardCount); err != nil {
		t.Fatalf("count cards: %v", err)
	}
	if cardCount != 2 {
		t.Fatalf("card count: got %d want 2", cardCount)
	}
}

func TestSave_ForeignProfile_IsNotFoundAndCreatesNothing(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "owner@example.test")
	profileID := createProfile(t, env, "Léo")

	// A different account, same browser client: the new session replaces the
	// old, so env.Client now acts as the intruder.
	login(t, env, "intruder@example.test")
	resp := env.Client.PostJSON(t, "/api/decks", map[string]any{
		"profile_id": profileID,
		"name":       "Volé",
		"cards":      []map[string]string{{"question": "q", "answer": "a"}},
	})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status: got %d want 404", resp.StatusCode)
	}
	var count int
	if err := env.DB.QueryRow(`SELECT count(*) FROM decks WHERE profile_id = $1`, profileID).
		Scan(&count); err != nil {
		t.Fatalf("count decks: %v", err)
	}
	if count != 0 {
		t.Fatalf("decks under the victim's profile: got %d want 0", count)
	}
}

func TestSave_EmptyName_IsBadRequest(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")
	profileID := createProfile(t, env, "Léo")

	resp := env.Client.PostJSON(t, "/api/decks", map[string]any{
		"profile_id": profileID,
		"name":       "   ",
		"cards":      []map[string]string{{"question": "q", "answer": "a"}},
	})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status: got %d want 400", resp.StatusCode)
	}
}

func TestSave_NoCards_IsBadRequest(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")
	profileID := createProfile(t, env, "Léo")

	resp := env.Client.PostJSON(t, "/api/decks", map[string]any{
		"profile_id": profileID,
		"name":       "Vide",
		"cards":      []map[string]string{},
	})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status: got %d want 400", resp.StatusCode)
	}
}

func TestSave_BlankCard_IsBadRequest(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")
	profileID := createProfile(t, env, "Léo")

	resp := env.Client.PostJSON(t, "/api/decks", map[string]any{
		"profile_id": profileID,
		"name":       "Presque",
		"cards":      []map[string]string{{"question": "  ", "answer": "a"}},
	})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status: got %d want 400", resp.StatusCode)
	}
}
