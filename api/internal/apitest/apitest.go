// Package apitest provides a handler-level test harness for the Go API.
//
// Typical usage from a test:
//
//	env := apitest.New(t)
//	resp := env.Client.PostJSON(t, "/api/auth/request", map[string]string{"email": "a@b.test"})
//	// ...
//
// The harness uses a real Postgres database (TEST_DATABASE_URL), the real
// stores, and the real server.NewHandler wiring — only email sending is
// faked, so tests catch wiring regressions instead of only verifying
// per-package logic in isolation.
package apitest

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"flashcardacademy/api/internal/auth"
	"flashcardacademy/api/internal/card"
	"flashcardacademy/api/internal/config"
	"flashcardacademy/api/internal/db"
	"flashcardacademy/api/internal/deck"
	"flashcardacademy/api/internal/email"
	"flashcardacademy/api/internal/profile"
	"flashcardacademy/api/internal/server"
	"flashcardacademy/api/internal/session"
	"flashcardacademy/api/internal/user"
)

const appBaseURL = "https://test.flashcardacademy.local"

// sharedDB is opened once per test binary so the CREATE DATABASE + migrate
// dance doesn't replay on every test. Subsequent tests just TRUNCATE.
var (
	sharedDB   *sql.DB
	sharedOnce sync.Once
	sharedErr  error
)

// Env bundles everything a handler-level test needs.
type Env struct {
	DB        *sql.DB
	Server    *httptest.Server
	Emails    *FakeEmailSender
	Generator *FakeGenerator
	Client    *Client
}

// New builds an Env, truncating any leftover data from a previous test so
// each test starts from a known-empty state. The Postgres database itself
// is created on the very first call of the test binary and reused after.
func New(t *testing.T) *Env {
	t.Helper()

	pool := getOrInitDB(t)
	truncate(t, pool)

	cfg := &config.Config{
		Env:          "test",
		AppBaseURL:   appBaseURL,
		SessionTTL:   24 * time.Hour,
		MagicLinkTTL: 15 * time.Minute,
	}

	emails := &FakeEmailSender{}
	generator := &FakeGenerator{}
	verificationStore := auth.NewStore(pool)
	sessionStore := session.NewStore(pool)
	userStore := user.NewStore(pool)
	profileStore := profile.NewStore(pool)
	cardStore := card.NewStore(pool)
	deckStore := deck.NewStore(pool)
	magic := auth.NewMagicLinkSender(verificationStore, emails, cfg.AppBaseURL, cfg.MagicLinkTTL)

	handler := server.NewHandler(server.Deps{
		// t.Context() is canceled at test end, so the rate-limit sweeper
		// goroutines exit cleanly — no orphaned goroutines across tests.
		Ctx:       t.Context(),
		Cfg:       cfg,
		Pool:      pool,
		Sessions:  sessionStore,
		Users:     userStore,
		Profiles:  profileStore,
		Magic:     magic,
		Generator: generator,
		Cards:     cardStore,
		Decks:     deckStore,
	})

	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	return &Env{
		DB:        pool,
		Server:    srv,
		Emails:    emails,
		Generator: generator,
		Client:    newClient(t, srv.URL),
	}
}

// Login signs the client in as email, ignoring the redirect response. Most
// tests only need a logged-in user, not the details of how they got there.
func (e *Env) Login(t *testing.T, email string) {
	t.Helper()
	e.RequestAndConsumeMagicLink(t, email).Body.Close()
}

// RequestAndConsumeMagicLink runs the full "request + click link" dance for
// the given email and returns the http.Response of the /verify call (which
// is a 303 redirect with the session cookie). It exists so tests don't have
// to repeat 8 lines of setup whenever they need a logged-in user.
func (e *Env) RequestAndConsumeMagicLink(t *testing.T, email string) *http.Response {
	t.Helper()
	resp := e.Client.PostJSON(t, "/api/auth/request", map[string]string{"email": email})
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("request magic link: status %d", resp.StatusCode)
	}
	link := e.Emails.LastFor(email)
	if link == "" {
		t.Fatalf("no magic link captured for %q", email)
	}
	rawToken := ExtractToken(t, link)
	return e.Client.Get(t, "/api/auth/verify?token="+rawToken)
}

// NewClient returns a fresh Client (own cookie jar) targeting the same test
// server as e.Client. Useful when a test needs to simulate a second user
// agent (e.g. replay attack from a different browser) without inheriting
// the session cookie from the primary flow.
func (e *Env) NewClient(t *testing.T) *Client {
	t.Helper()
	return newClient(t, e.Server.URL)
}

// ─── DB lifecycle ───────────────────────────────────────────────

func getOrInitDB(t *testing.T) *sql.DB {
	t.Helper()
	sharedOnce.Do(func() {
		sharedDB, sharedErr = initDB()
	})
	if sharedErr != nil {
		t.Fatalf("init test db: %v", sharedErr)
	}
	return sharedDB
}

// initDB connects to TEST_DATABASE_URL, creating the database first if it
// doesn't exist yet, then runs migrations. Migrations are idempotent so
// re-running between test binaries is harmless.
func initDB() (*sql.DB, error) {
	testURL := os.Getenv("TEST_DATABASE_URL")
	if testURL == "" {
		return nil, errors.New("TEST_DATABASE_URL is not set (see docker/compose.dev.yaml)")
	}

	// Each test binary gets its own database (suffix = binary name). Go's
	// default is to run packages in parallel, and apitest's harness shares
	// state via TRUNCATE — without per-binary isolation, two packages
	// would wipe each other's rows mid-test. Trade-off: leaves one DB per
	// package in Postgres; clean them with `make db-test-clean`.
	testURL, err := suffixDBForCurrentBinary(testURL)
	if err != nil {
		return nil, fmt.Errorf("derive per-binary test db url: %w", err)
	}

	// Try the test DB first. The expected error on a fresh install is
	// SQLSTATE 3D000 (invalid_catalog_name) — the DB doesn't exist yet —
	// at which point we create it via the admin DB and retry.
	pool, err := openAndPing(testURL)
	if err != nil {
		if !strings.Contains(err.Error(), "3D000") {
			return nil, err
		}
		if err := createTestDB(testURL); err != nil {
			return nil, err
		}
		pool, err = openAndPing(testURL)
		if err != nil {
			return nil, fmt.Errorf("reopen after create: %w", err)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.Migrate(ctx, pool); err != nil {
		return nil, fmt.Errorf("migrate test db: %w", err)
	}
	return pool, nil
}

func openAndPing(dsn string) (*sql.DB, error) {
	pool, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("open: %w", err)
	}
	// Bound the test pool explicitly — Go's default MaxOpenConns is 0
	// (unlimited), which lets concurrent test binaries burst-open more
	// connections than Postgres's max_connections allows. A small ceiling
	// is plenty for our serial test execution.
	pool.SetMaxOpenConns(5)
	pool.SetMaxIdleConns(2)
	pool.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := pool.PingContext(ctx); err != nil {
		_ = pool.Close()
		return nil, err
	}
	return pool, nil
}

// suffixDBForCurrentBinary appends a unique suffix to the database name in
// the URL, derived from the running test binary. `go test ./...` compiles
// one binary per package (e.g. session.test, user.test), so the suffix
// gives each package an isolated database.
func suffixDBForCurrentBinary(rawURL string) (string, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("parse: %w", err)
	}
	if u.Path == "" || u.Path == "/" {
		return "", errors.New("url has no database name")
	}
	suffix := strings.TrimSuffix(filepath.Base(os.Args[0]), ".test")
	// Postgres identifiers don't accept "." or "-"; replace with "_".
	suffix = strings.NewReplacer(".", "_", "-", "_").Replace(suffix)
	if suffix == "" {
		return "", fmt.Errorf("empty suffix from os.Args[0]=%q", os.Args[0])
	}
	u.Path = u.Path + "_" + suffix
	return u.String(), nil
}

func createTestDB(testURL string) error {
	u, err := url.Parse(testURL)
	if err != nil {
		return fmt.Errorf("parse test url: %w", err)
	}
	dbName := strings.TrimPrefix(u.Path, "/")
	if dbName == "" {
		return errors.New("TEST_DATABASE_URL has no database name in its path")
	}

	adminURL := *u
	adminURL.Path = "/postgres"
	admin, err := openAndPing(adminURL.String())
	if err != nil {
		return fmt.Errorf("open admin db: %w", err)
	}
	defer admin.Close()

	// CREATE DATABASE doesn't support parameterized identifiers; the name
	// comes from our own env var (not user input), so direct interpolation
	// is acceptable here.
	if _, err := admin.Exec(`CREATE DATABASE "` + dbName + `"`); err != nil {
		// Tolerate the race where two test binaries try to create it at once.
		if !strings.Contains(err.Error(), "already exists") {
			return fmt.Errorf("create database %s: %w", dbName, err)
		}
	}
	return nil
}

// truncate clears all user-facing tables but keeps the schema and migration
// history intact. RESTART IDENTITY resets bigint sequences so test IDs are
// predictable (user 1 in test A and test B both have id=1).
func truncate(t *testing.T, pool *sql.DB) {
	t.Helper()
	_, err := pool.Exec(`TRUNCATE users, sessions, verifications, profiles, decks, cards RESTART IDENTITY CASCADE`)
	if err != nil {
		t.Fatalf("truncate: %v", err)
	}
}

// ─── Fake email sender ──────────────────────────────────────────

type SentEmail struct {
	To   string
	Link string
}

type FakeEmailSender struct {
	mu   sync.Mutex
	sent []SentEmail
}

// Compile-time check: FakeEmailSender must satisfy email.Sender so that an
// interface change (new method) breaks the build here rather than going
// undetected via structural typing at the call site.
var _ email.Sender = (*FakeEmailSender)(nil)

func (f *FakeEmailSender) SendMagicLink(_ context.Context, to, link string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.sent = append(f.sent, SentEmail{To: to, Link: link})
	return nil
}

func (f *FakeEmailSender) Count() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.sent)
}

// LastFor returns the most recently captured magic link for the given
// recipient, or "" if none was sent. Used by tests to follow the magic-link
// flow without parsing real email content.
func (f *FakeEmailSender) LastFor(email string) string {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i := len(f.sent) - 1; i >= 0; i-- {
		if f.sent[i].To == email {
			return f.sent[i].Link
		}
	}
	return ""
}

// ─── Fake card generator ────────────────────────────────────────

// FakeGenerator stands in for the Anthropic call. Unlike FakeEmailSender it
// is configurable: Cards and Err let a test drive the handler's success and
// failure branches without a network round-trip.
type FakeGenerator struct {
	mu    sync.Mutex
	texts []string

	// Cards is returned on success. Nil yields one placeholder card, which
	// is enough for tests that only care that generation was wired up.
	Cards []card.Draft
	// Err, when set, is returned instead of Cards.
	Err error
}

// Compile-time check: FakeGenerator must satisfy deck.Generator so an
// interface change breaks the build here rather than at the call site.
var _ deck.Generator = (*FakeGenerator)(nil)

func (f *FakeGenerator) Generate(_ context.Context, text string) ([]card.Draft, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.texts = append(f.texts, text)
	if f.Err != nil {
		return nil, f.Err
	}
	if f.Cards != nil {
		return f.Cards, nil
	}
	return []card.Draft{{
		Question: "Combien de planètes dans le système solaire ?",
		Answer:   "Huit.",
	}}, nil
}

func (f *FakeGenerator) Count() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.texts)
}

// LastText returns the text handed to the most recent Generate call, or ""
// if it was never called. Lets tests assert what actually reached the
// provider (e.g. that the handler trimmed it).
func (f *FakeGenerator) LastText() string {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.texts) == 0 {
		return ""
	}
	return f.texts[len(f.texts)-1]
}

// ─── HTTP client ────────────────────────────────────────────────

// Client wraps an http.Client with a cookie jar (so login/logout flows are
// natural) and JSON encoding helpers. Redirects are NOT followed — the
// caller asserts the 303 explicitly because the redirect target (/learn or
// /onboarding) is a frontend route that wouldn't resolve here anyway.
type Client struct {
	base string
	http *http.Client
}

func newClient(t *testing.T, baseURL string) *Client {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookie jar: %v", err)
	}
	return &Client{
		base: baseURL,
		http: &http.Client{
			Jar:     jar,
			Timeout: 5 * time.Second,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

func (c *Client) Get(t *testing.T, path string) *http.Response {
	t.Helper()
	return c.do(t, http.MethodGet, path, nil)
}

func (c *Client) PostJSON(t *testing.T, path string, body any) *http.Response {
	t.Helper()
	return c.do(t, http.MethodPost, path, body)
}

func (c *Client) PatchJSON(t *testing.T, path string, body any) *http.Response {
	t.Helper()
	return c.do(t, http.MethodPatch, path, body)
}

func (c *Client) Post(t *testing.T, path string) *http.Response {
	t.Helper()
	return c.do(t, http.MethodPost, path, nil)
}

func (c *Client) do(t *testing.T, method, path string, body any) *http.Response {
	t.Helper()
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		reader = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, c.base+path, reader)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		t.Fatalf("do request: %v", err)
	}
	return resp
}

// CookieValue returns the value of the named cookie currently held in the
// jar, or "" if not set. Useful for asserting cookie rotation.
func (c *Client) CookieValue(t *testing.T, name string) string {
	t.Helper()
	u, err := url.Parse(c.base)
	if err != nil {
		t.Fatalf("parse base url: %v", err)
	}
	for _, ck := range c.http.Jar.Cookies(u) {
		if ck.Name == name {
			return ck.Value
		}
	}
	return ""
}

// DecodeJSON drains and decodes resp.Body into out. Always closes the body.
func DecodeJSON(t *testing.T, resp *http.Response, out any) {
	t.Helper()
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		t.Fatalf("decode json: %v", err)
	}
}

// ExtractToken pulls the raw token query param out of a magic-link URL,
// failing the test if the URL is malformed or the token is absent. Tests
// use this rather than substring math so a URL format change surfaces as a
// clear failure instead of a silently-truncated token.
func ExtractToken(t *testing.T, link string) string {
	t.Helper()
	u, err := url.Parse(link)
	if err != nil {
		t.Fatalf("parse magic link: %v", err)
	}
	tok := u.Query().Get("token")
	if tok == "" {
		t.Fatalf("magic link has no token query param: %q", link)
	}
	return tok
}
