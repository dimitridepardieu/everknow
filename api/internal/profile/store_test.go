package profile_test

import (
	"context"
	"testing"

	"everknow/api/internal/apitest"
	"everknow/api/internal/profile"
	"everknow/api/internal/user"
)

// seedUser creates a user to own the profiles under test — profiles.user_id
// is a NOT NULL foreign key, so every profile needs a real owner.
func seedUser(t *testing.T, users *user.Store, email string) *user.User {
	t.Helper()
	u, err := users.Create(context.Background(), email)
	if err != nil {
		t.Fatalf("seed user %q: %v", email, err)
	}
	return u
}

func TestStore_Create_PersistsNameAndAge(t *testing.T) {
	env := apitest.New(t)
	users := user.NewStore(env.DB)
	store := profile.NewStore(env.DB)
	u := seedUser(t, users, "parent@example.test")

	name, age := "Léa", 7
	p, err := store.Create(context.Background(), u.ID, &name, &age)
	if err != nil {
		t.Fatalf("create profile: %v", err)
	}
	if p.ID == 0 {
		t.Fatalf("id: got 0 want > 0 (RETURNING should populate it)")
	}
	if p.UserID != u.ID {
		t.Fatalf("user_id: got %d want %d", p.UserID, u.ID)
	}
	if p.Name == nil || *p.Name != name {
		t.Fatalf("name: got %v want %q", p.Name, name)
	}
	// The nullable smallint round-trips through *int — this is the one scan
	// this codebase hadn't exercised before.
	if p.Age == nil || *p.Age != age {
		t.Fatalf("age: got %v want %d", p.Age, age)
	}
}

func TestStore_Create_NilNameAndAge(t *testing.T) {
	env := apitest.New(t)
	users := user.NewStore(env.DB)
	store := profile.NewStore(env.DB)
	u := seedUser(t, users, "solo@example.test")

	// The individual auto-profile: no name, no age.
	p, err := store.Create(context.Background(), u.ID, nil, nil)
	if err != nil {
		t.Fatalf("create profile: %v", err)
	}
	if p.Name != nil {
		t.Fatalf("name: got %v want nil", p.Name)
	}
	if p.Age != nil {
		t.Fatalf("age: got %v want nil", p.Age)
	}
}

func TestStore_ListByUser_ScopesToOwner(t *testing.T) {
	env := apitest.New(t)
	users := user.NewStore(env.DB)
	store := profile.NewStore(env.DB)
	owner := seedUser(t, users, "owner@example.test")
	other := seedUser(t, users, "other@example.test")

	a, b := "Ana", "Ben"
	if _, err := store.Create(context.Background(), owner.ID, &a, nil); err != nil {
		t.Fatalf("seed profile a: %v", err)
	}
	if _, err := store.Create(context.Background(), owner.ID, &b, nil); err != nil {
		t.Fatalf("seed profile b: %v", err)
	}
	// A profile on the other account must never surface in owner's list.
	other1 := "Zoe"
	if _, err := store.Create(context.Background(), other.ID, &other1, nil); err != nil {
		t.Fatalf("seed other profile: %v", err)
	}

	got, err := store.ListByUser(context.Background(), owner.ID)
	if err != nil {
		t.Fatalf("list by user: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("count: got %d want 2 (owner's profiles only)", len(got))
	}
	// Ordered by created_at, so Ana before Ben.
	if got[0].Name == nil || *got[0].Name != a {
		t.Fatalf("first: got %v want %q", got[0].Name, a)
	}
	if got[1].Name == nil || *got[1].Name != b {
		t.Fatalf("second: got %v want %q", got[1].Name, b)
	}
}

func TestStore_ListByUser_EmptyIsNotError(t *testing.T) {
	env := apitest.New(t)
	users := user.NewStore(env.DB)
	store := profile.NewStore(env.DB)
	u := seedUser(t, users, "childless@example.test")

	got, err := store.ListByUser(context.Background(), u.ID)
	if err != nil {
		t.Fatalf("list by user: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("count: got %d want 0", len(got))
	}
}
