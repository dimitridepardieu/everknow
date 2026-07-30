package profile_test

import (
	"net/http"
	"testing"

	"everknow/api/internal/apitest"
)

type profileJSON struct {
	ID   int64   `json:"id"`
	Name *string `json:"name"`
	Age  *int    `json:"age"`
}

func TestCreateProfile_RequiresAuth(t *testing.T) {
	env := apitest.New(t)

	resp := env.Client.PostJSON(t, "/api/profiles", map[string]any{"name": "Léa"})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status: got %d want 401", resp.StatusCode)
	}
}

func TestCreateProfile_PersistsAndLists(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "parent@example.test")

	created := env.Client.PostJSON(t, "/api/profiles", map[string]any{"name": "Léa", "age": 7})
	if created.StatusCode != http.StatusCreated {
		created.Body.Close()
		t.Fatalf("create status: got %d want 201", created.StatusCode)
	}
	var got profileJSON
	apitest.DecodeJSON(t, created, &got)
	if got.ID == 0 {
		t.Fatalf("id: got 0 want > 0")
	}
	if got.Name == nil || *got.Name != "Léa" {
		t.Fatalf("name: got %v want %q", got.Name, "Léa")
	}
	if got.Age == nil || *got.Age != 7 {
		t.Fatalf("age: got %v want 7", got.Age)
	}

	list := env.Client.Get(t, "/api/profiles")
	var profiles []profileJSON
	apitest.DecodeJSON(t, list, &profiles)
	if len(profiles) != 1 {
		t.Fatalf("list count: got %d want 1", len(profiles))
	}
}

func TestCreateProfile_EmptyName_Rejected(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "parent@example.test")

	resp := env.Client.PostJSON(t, "/api/profiles", map[string]any{"name": "   "})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status: got %d want 400", resp.StatusCode)
	}
}

func TestListProfiles_ScopedToOwner(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "owner@example.test")
	env.Client.PostJSON(t, "/api/profiles", map[string]any{"name": "Ana"}).Body.Close()

	// A second login on the same client swaps the session to another user.
	// That user must not see the first user's profiles.
	env.Login(t, "other@example.test")
	list := env.Client.Get(t, "/api/profiles")
	var profiles []profileJSON
	apitest.DecodeJSON(t, list, &profiles)
	if len(profiles) != 0 {
		t.Fatalf("list count: got %d want 0 (another user's profiles must not leak)", len(profiles))
	}
}

func TestOnboardIndividual_AutoCreatesOneProfile(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "solo@example.test")

	patch := env.Client.PatchJSON(t, "/api/me", map[string]any{"role": "individual"})
	patch.Body.Close()
	if patch.StatusCode != http.StatusNoContent {
		t.Fatalf("patch role status: got %d want 204", patch.StatusCode)
	}

	list := env.Client.Get(t, "/api/profiles")
	var profiles []profileJSON
	apitest.DecodeJSON(t, list, &profiles)
	if len(profiles) != 1 {
		t.Fatalf("list count: got %d want 1 (individual gets one auto profile)", len(profiles))
	}
	if profiles[0].Name != nil {
		t.Fatalf("auto profile name: got %v want nil", profiles[0].Name)
	}
}

func TestOnboardFamily_NoAutoProfile(t *testing.T) {
	env := apitest.New(t)
	env.Login(t, "family@example.test")

	patch := env.Client.PatchJSON(t, "/api/me", map[string]any{"role": "family"})
	patch.Body.Close()
	if patch.StatusCode != http.StatusNoContent {
		t.Fatalf("patch role status: got %d want 204", patch.StatusCode)
	}

	list := env.Client.Get(t, "/api/profiles")
	var profiles []profileJSON
	apitest.DecodeJSON(t, list, &profiles)
	if len(profiles) != 0 {
		t.Fatalf("list count: got %d want 0 (family names children explicitly)", len(profiles))
	}
}
