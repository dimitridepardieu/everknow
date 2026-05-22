package user_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"flashcardacademy/api/internal/apitest"
	"flashcardacademy/api/internal/user"
)

const testEmail = "alice@example.test"

func TestStore_Create_PersistsUser(t *testing.T) {
	env := apitest.New(t)
	store := user.NewStore(env.DB)

	u, err := store.Create(context.Background(), testEmail)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	if u.ID == 0 {
		t.Fatalf("id: got 0 want > 0 (RETURNING should populate it)")
	}
	if u.Email != testEmail {
		t.Fatalf("email: got %q want %q", u.Email, testEmail)
	}
	if !u.EmailVerified {
		t.Fatalf("email_verified: got false want true (Create sets it to true)")
	}
	if u.Role != nil {
		t.Fatalf("role: got %v want nil for a fresh user", u.Role)
	}
}

func TestStore_Create_DuplicateEmail_ReturnsError(t *testing.T) {
	env := apitest.New(t)
	store := user.NewStore(env.DB)

	if _, err := store.Create(context.Background(), testEmail); err != nil {
		t.Fatalf("first create: %v", err)
	}

	_, err := store.Create(context.Background(), testEmail)
	if err == nil {
		t.Fatalf("second create: got nil want UNIQUE-violation error")
	}
	// We don't assert the exact Postgres error code (23505) — the contract
	// is "errors on duplicate", not "exposes a particular code".
	if !strings.Contains(err.Error(), "create user") {
		t.Fatalf("error not wrapped by store: %v", err)
	}
}

func TestStore_FindByEmail_HappyPath(t *testing.T) {
	env := apitest.New(t)
	store := user.NewStore(env.DB)
	created, err := store.Create(context.Background(), testEmail)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	found, err := store.FindByEmail(context.Background(), testEmail)
	if err != nil {
		t.Fatalf("find by email: %v", err)
	}
	if found.ID != created.ID {
		t.Fatalf("id: got %d want %d", found.ID, created.ID)
	}
}

func TestStore_FindByEmail_Unknown_ReturnsNotFound(t *testing.T) {
	env := apitest.New(t)
	store := user.NewStore(env.DB)

	if _, err := store.FindByEmail(context.Background(), "nobody@example.test"); !errors.Is(err, user.ErrNotFound) {
		t.Fatalf("unknown email: got err=%v want ErrNotFound", err)
	}
}

func TestStore_FindByID_HappyPath(t *testing.T) {
	env := apitest.New(t)
	store := user.NewStore(env.DB)
	created, err := store.Create(context.Background(), testEmail)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	found, err := store.FindByID(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("find by id: %v", err)
	}
	if found.Email != testEmail {
		t.Fatalf("email: got %q want %q", found.Email, testEmail)
	}
}

func TestStore_FindByID_Unknown_ReturnsNotFound(t *testing.T) {
	env := apitest.New(t)
	store := user.NewStore(env.DB)

	if _, err := store.FindByID(context.Background(), 99999); !errors.Is(err, user.ErrNotFound) {
		t.Fatalf("unknown id: got err=%v want ErrNotFound", err)
	}
}

func TestStore_UpdateRole_HappyPath(t *testing.T) {
	env := apitest.New(t)
	store := user.NewStore(env.DB)
	created, err := store.Create(context.Background(), testEmail)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	if err := store.UpdateRole(context.Background(), created.ID, user.RoleParent); err != nil {
		t.Fatalf("update role: %v", err)
	}

	updated, err := store.FindByID(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("re-read user: %v", err)
	}
	if updated.Role == nil || *updated.Role != user.RoleParent {
		t.Fatalf("role: got %v want %q", updated.Role, user.RoleParent)
	}
}

func TestStore_UpdateRole_Nonexistent_ReturnsNotFound(t *testing.T) {
	env := apitest.New(t)
	store := user.NewStore(env.DB)

	// The store distinguishes "row didn't exist" from a SQL error by
	// inspecting RowsAffected — callers rely on this so e.g. an admin
	// endpoint can return 404 instead of 500 for a deleted user.
	if err := store.UpdateRole(context.Background(), 99999, user.RoleParent); !errors.Is(err, user.ErrNotFound) {
		t.Fatalf("update on nonexistent: got err=%v want ErrNotFound", err)
	}
}
