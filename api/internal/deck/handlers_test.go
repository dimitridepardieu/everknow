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
	Category string `json:"category"`
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

	resp := env.Client.PostJSON(t, "/api/decks/generate", map[string]any{"text": sourceText})
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
		{Question: "Combien de planètes ?", Answer: "Huit.", Category: "Astronomie"},
		{Question: "Quelle est la plus grosse ?", Answer: "Jupiter.", Category: "Astronomie"},
	}

	resp := env.Client.PostJSON(t, "/api/decks/generate", map[string]any{"text": sourceText})
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
	if got.Cards[0].Category != "Astronomie" {
		t.Fatalf("category: got %q", got.Cards[0].Category)
	}
}

func TestGenerate_TrimsTextBeforeCallingProvider(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")

	env.Client.PostJSON(t, "/api/decks/generate",
		map[string]any{"text": "\n\t  " + sourceText + "  \n"}).Body.Close()

	if got := env.Cards.LastText(); got != sourceText {
		t.Fatalf("provider received untrimmed text: got %q", got)
	}
}

func TestGenerate_ShortText_RejectedWithoutCallingProvider(t *testing.T) {
	env := apitest.New(t)
	login(t, env, "parent@example.test")

	resp := env.Client.PostJSON(t, "/api/decks/generate", map[string]any{"text": "Bonjour."})
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

	resp := env.Client.PostJSON(t, "/api/decks/generate",
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

	resp := env.Client.PostJSON(t, "/api/decks/generate",
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

	resp := env.Client.PostJSON(t, "/api/decks/generate", map[string]any{"text": sourceText})
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

	resp := env.Client.PostJSON(t, "/api/decks/generate", map[string]any{"text": sourceText})
	defer resp.Body.Close()
	// The text, not the server, is what failed — the parent can fix it by
	// pasting something richer.
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status: got %d want 400", resp.StatusCode)
	}
}
