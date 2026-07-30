package db_test

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"everknow/api/internal/db"
)

// TestMigrate_Idempotent covers the contract documented in db.Migrate:
// running it more than once must be a no-op. We give the runner its own
// throwaway database so that a) we don't pollute the test DB the rest of
// the suite uses, and b) we get a guaranteed clean slate to apply the full
// chain of migrations from scratch.
func TestMigrate_Idempotent(t *testing.T) {
	testURL := os.Getenv("TEST_DATABASE_URL")
	if testURL == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}

	throwawayDB := fmt.Sprintf("everknow_migrate_test_%d", time.Now().UnixNano())
	throwawayURL := mustReplaceDB(t, testURL, throwawayDB)

	createDB(t, testURL, throwawayDB)
	t.Cleanup(func() { dropDB(t, testURL, throwawayDB) })

	pool, err := sql.Open("postgres", throwawayURL)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer pool.Close()

	if err := runMigrate(pool); err != nil {
		t.Fatalf("first migrate: %v", err)
	}
	firstCount := countMigrations(t, pool)
	if firstCount == 0 {
		t.Fatalf("first migrate applied nothing")
	}

	if err := runMigrate(pool); err != nil {
		t.Fatalf("second migrate: %v", err)
	}
	secondCount := countMigrations(t, pool)
	if secondCount != firstCount {
		t.Fatalf("not idempotent: first=%d second=%d", firstCount, secondCount)
	}
}

// runMigrate gives each Migrate call its own timeout so a slow first run
// can't silently expire the deadline for the second one (which would
// surface as a misleading "second migrate" error).
func runMigrate(pool *sql.DB) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return db.Migrate(ctx, pool)
}

func mustReplaceDB(t *testing.T, dsn, newName string) string {
	t.Helper()
	u, err := url.Parse(dsn)
	if err != nil {
		t.Fatalf("parse dsn: %v", err)
	}
	u.Path = "/" + newName
	return u.String()
}

func createDB(t *testing.T, dsn, name string) {
	t.Helper()
	adminURL := mustReplaceDB(t, dsn, "postgres")
	admin, err := sql.Open("postgres", adminURL)
	if err != nil {
		t.Fatalf("open admin: %v", err)
	}
	defer admin.Close()
	if _, err := admin.Exec(`CREATE DATABASE "` + name + `"`); err != nil {
		t.Fatalf("create %s: %v", name, err)
	}
}

func dropDB(t *testing.T, dsn, name string) {
	t.Helper()
	adminURL := mustReplaceDB(t, dsn, "postgres")
	admin, err := sql.Open("postgres", adminURL)
	if err != nil {
		t.Logf("open admin for drop: %v", err)
		return
	}
	defer admin.Close()
	if _, err := admin.Exec(`DROP DATABASE IF EXISTS "` + name + `" WITH (FORCE)`); err != nil {
		t.Logf("drop %s: %v", name, err)
	}
}

func countMigrations(t *testing.T, pool *sql.DB) int {
	t.Helper()
	var n int
	if err := pool.QueryRow(`SELECT count(*) FROM schema_migrations`).Scan(&n); err != nil {
		t.Fatalf("count migrations: %v", err)
	}
	return n
}
