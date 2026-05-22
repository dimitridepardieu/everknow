package session_test

import (
	"bytes"
	"context"
	"errors"
	"testing"
	"time"

	"flashcardacademy/api/internal/apitest"
	"flashcardacademy/api/internal/session"
	"flashcardacademy/api/internal/token"
)

const (
	testEmail = "alice@example.test"
	rawToken  = "raw-session-token-test-value"
)

// seedUser inserts a minimal users row directly via SQL and returns its id.
// sessions.user_id has a FK on users(id), so every session test needs a
// user to anchor against. We bypass user.Store on purpose — these tests
// must not fail because of a regression in another package.
func seedUser(t *testing.T, env *apitest.Env) int64 {
	t.Helper()
	var id int64
	err := env.DB.QueryRow(
		`INSERT INTO users (email, email_verified) VALUES ($1, true) RETURNING id`,
		testEmail,
	).Scan(&id)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}
	return id
}

func TestStore_Create_StoresHashedTokenNotRaw(t *testing.T) {
	env := apitest.New(t)
	store := session.NewStore(env.DB)
	userID := seedUser(t, env)

	if err := store.Create(context.Background(), userID, rawToken, time.Now().Add(time.Hour), nil, "ua"); err != nil {
		t.Fatalf("create session: %v", err)
	}

	// The raw token must never hit the DB. Storing sha256 means a leaked
	// DB dump alone can't be replayed as a session cookie.
	var stored []byte
	if err := env.DB.QueryRow(`SELECT token FROM sessions WHERE user_id = $1`, userID).Scan(&stored); err != nil {
		t.Fatalf("read stored token: %v", err)
	}
	if !bytes.Equal(stored, token.Hash(rawToken)) {
		t.Fatalf("stored token is not sha256 of raw — raw-leak risk")
	}
}

func TestStore_GetByToken_HappyPath(t *testing.T) {
	env := apitest.New(t)
	store := session.NewStore(env.DB)
	userID := seedUser(t, env)
	if err := store.Create(context.Background(), userID, rawToken, time.Now().Add(time.Hour), nil, "ua"); err != nil {
		t.Fatalf("create session: %v", err)
	}

	sess, err := store.GetByToken(context.Background(), rawToken)
	if err != nil {
		t.Fatalf("get session: %v", err)
	}
	if sess.UserID != userID {
		t.Fatalf("user_id: got %d want %d", sess.UserID, userID)
	}
	if sess.IPAddress != nil {
		t.Fatalf("ip_address: got %v want nil", sess.IPAddress)
	}
	if sess.UserAgent == nil || *sess.UserAgent != "ua" {
		t.Fatalf("user_agent: got %v want \"ua\"", sess.UserAgent)
	}
}

func TestStore_GetByToken_Expired_ReturnsNotFound(t *testing.T) {
	env := apitest.New(t)
	store := session.NewStore(env.DB)
	userID := seedUser(t, env)

	// Seed directly with expires_at in the past so the WHERE clause
	// "expires_at > now()" in GetByToken is what filters it out. Calling
	// Create with a past expiry would also work but wouldn't distinguish
	// a write-time filter from a read-time one.
	_, err := env.DB.Exec(
		`INSERT INTO sessions (user_id, token, expires_at, user_agent) VALUES ($1, $2, now() - interval '1 minute', 'ua')`,
		userID, token.Hash(rawToken),
	)
	if err != nil {
		t.Fatalf("seed expired session: %v", err)
	}

	if _, err := store.GetByToken(context.Background(), rawToken); !errors.Is(err, session.ErrNotFound) {
		t.Fatalf("expired session: got err=%v want ErrNotFound", err)
	}
}

func TestStore_GetByToken_Unknown_ReturnsNotFound(t *testing.T) {
	env := apitest.New(t)
	store := session.NewStore(env.DB)

	if _, err := store.GetByToken(context.Background(), "never-issued-token"); !errors.Is(err, session.ErrNotFound) {
		t.Fatalf("unknown token: got err=%v want ErrNotFound", err)
	}
}

func TestStore_DeleteByToken_RemovesRow(t *testing.T) {
	env := apitest.New(t)
	store := session.NewStore(env.DB)
	userID := seedUser(t, env)
	if err := store.Create(context.Background(), userID, rawToken, time.Now().Add(time.Hour), nil, "ua"); err != nil {
		t.Fatalf("create session: %v", err)
	}

	if err := store.DeleteByToken(context.Background(), rawToken); err != nil {
		t.Fatalf("delete session: %v", err)
	}

	var count int
	if err := env.DB.QueryRow(`SELECT count(*) FROM sessions WHERE user_id = $1`, userID).Scan(&count); err != nil {
		t.Fatalf("count sessions: %v", err)
	}
	if count != 0 {
		t.Fatalf("rows after delete: got %d want 0", count)
	}
}

func TestStore_DeleteByToken_Unknown_IsNoop(t *testing.T) {
	env := apitest.New(t)
	store := session.NewStore(env.DB)

	// Deleting a token that was never issued must not error. Logout can
	// race with cookie expiry, and the handler shouldn't 500 because a
	// stale cookie value matched no row.
	if err := store.DeleteByToken(context.Background(), "never-issued-token"); err != nil {
		t.Fatalf("delete unknown: got err %v want nil", err)
	}
}
