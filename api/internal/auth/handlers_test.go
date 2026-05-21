package auth_test

import (
	"net/http"
	"strings"
	"testing"

	"flashcardacademy/api/internal/apitest"
	"flashcardacademy/api/internal/token"
)

const testEmail = "alice@example.test"

func TestRequestMagicLink_SendsEmail(t *testing.T) {
	env := apitest.New(t)

	resp := env.Client.PostJSON(t, "/api/auth/request", map[string]string{"email": testEmail})
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status: got %d want 200", resp.StatusCode)
	}
	if got := env.Emails.Count(); got != 1 {
		t.Fatalf("emails sent: got %d want 1", got)
	}
	if link := env.Emails.LastFor(testEmail); !strings.Contains(link, "/api/auth/verify?token=") {
		t.Fatalf("magic link malformed: %q", link)
	}
}

func TestRequestMagicLink_InvalidEmail(t *testing.T) {
	env := apitest.New(t)

	resp := env.Client.PostJSON(t, "/api/auth/request", map[string]string{"email": "not-an-email"})
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status: got %d want 400", resp.StatusCode)
	}
	if env.Emails.Count() != 0 {
		t.Fatalf("should not have sent an email for invalid input")
	}
}

func TestRequestMagicLink_UnknownEmail_StillReturnsOK(t *testing.T) {
	// Anti-enumeration: even when the address doesn't exist, the response
	// must look identical to a successful send.
	env := apitest.New(t)

	resp := env.Client.PostJSON(t, "/api/auth/request", map[string]string{"email": "nobody@example.test"})
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status: got %d want 200", resp.StatusCode)
	}
}

func TestRequestMagicLink_RateLimitedPerEmail(t *testing.T) {
	// The email bucket is 3 / hour (see server.magicLinkLimitPerEmail).
	// Three requests succeed; the fourth must be 429 with a Retry-After
	// header. We don't assert that the message reveals which dimension
	// triggered (IP vs email) — that opacity is part of the design.
	env := apitest.New(t)

	for i := 0; i < 3; i++ {
		resp := env.Client.PostJSON(t, "/api/auth/request", map[string]string{"email": testEmail})
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("request %d: status %d want 200", i+1, resp.StatusCode)
		}
	}

	rejected := env.Client.PostJSON(t, "/api/auth/request", map[string]string{"email": testEmail})
	defer rejected.Body.Close()
	if rejected.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("4th request: status %d want 429", rejected.StatusCode)
	}
	if ra := rejected.Header.Get("Retry-After"); ra == "" {
		t.Fatalf("Retry-After header missing on 429")
	}
	if env.Emails.Count() != 3 {
		t.Fatalf("emails sent: got %d want 3 (4th must be rate-limited before send)", env.Emails.Count())
	}
}

func TestVerify_NewUser_RedirectsToOnboarding(t *testing.T) {
	env := apitest.New(t)

	resp := env.RequestAndConsumeMagicLink(t, testEmail)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("status: got %d want 303", resp.StatusCode)
	}
	if loc := resp.Header.Get("Location"); loc != "/onboarding" {
		t.Fatalf("location: got %q want /onboarding", loc)
	}
	if env.Client.CookieValue(t, apitest.SessionCookieName) == "" {
		t.Fatalf("session cookie not set")
	}

	var count int
	if err := env.DB.QueryRow(`SELECT count(*) FROM users WHERE email = $1`, testEmail).Scan(&count); err != nil {
		t.Fatalf("query users: %v", err)
	}
	if count != 1 {
		t.Fatalf("users created: got %d want 1", count)
	}
}

func TestVerify_ExistingUser_RedirectsToLearn(t *testing.T) {
	env := apitest.New(t)
	if _, err := env.DB.Exec(
		`INSERT INTO users (email, email_verified, role) VALUES ($1, true, 'parent')`,
		testEmail,
	); err != nil {
		t.Fatalf("seed user: %v", err)
	}

	resp := env.RequestAndConsumeMagicLink(t, testEmail)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("status: got %d want 303", resp.StatusCode)
	}
	if loc := resp.Header.Get("Location"); loc != "/learn" {
		t.Fatalf("location: got %q want /learn", loc)
	}
}

func TestVerify_InvalidToken_RedirectsWithError(t *testing.T) {
	env := apitest.New(t)

	resp := env.Client.Get(t, "/api/auth/verify?token=this-token-was-never-issued")
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("status: got %d want 303", resp.StatusCode)
	}
	if loc := resp.Header.Get("Location"); loc != "/login?error=invalid_or_expired_token" {
		t.Fatalf("location: got %q", loc)
	}
	if env.Client.CookieValue(t, apitest.SessionCookieName) != "" {
		t.Fatalf("no session cookie should be set on failure")
	}
}

func TestVerify_TokenIsSingleUse(t *testing.T) {
	env := apitest.New(t)

	resp1 := env.Client.PostJSON(t, "/api/auth/request", map[string]string{"email": testEmail})
	resp1.Body.Close()
	tok := apitest.ExtractToken(t, env.Emails.LastFor(testEmail))

	first := env.Client.Get(t, "/api/auth/verify?token="+tok)
	first.Body.Close()
	if first.StatusCode != http.StatusSeeOther {
		t.Fatalf("first verify status: got %d want 303", first.StatusCode)
	}
	if loc := first.Header.Get("Location"); loc != "/onboarding" {
		t.Fatalf("first verify location: got %q want /onboarding", loc)
	}

	// Replay from a fresh client (no cookie jar) on the SAME env — same DB,
	// same verifications table, just without the session cookie from the
	// first call. The token row was DELETE'd by the first /verify, so the
	// replay must be rejected because the token is gone, not because the
	// table is empty (which an apitest.New would falsely produce).
	replay := env.NewClient(t).Get(t, "/api/auth/verify?token="+tok)
	defer replay.Body.Close()
	if loc := replay.Header.Get("Location"); loc != "/login?error=invalid_or_expired_token" {
		t.Fatalf("replay should be rejected; got location %q", loc)
	}
}

func TestVerify_ExpiredToken(t *testing.T) {
	env := apitest.New(t)

	// Insert a verification row directly with expires_at in the past. The
	// handler must treat it as invalid_or_expired_token, not as a usable
	// link — the TTL check is in the SQL WHERE clause of ConsumeByTokenHash.
	const rawToken = "expired-token-raw-test-value"
	hash := token.Hash(rawToken)
	_, err := env.DB.Exec(
		`INSERT INTO verifications (identifier, value, expires_at) VALUES ($1, $2, now() - interval '1 minute')`,
		testEmail, hash,
	)
	if err != nil {
		t.Fatalf("seed expired verification: %v", err)
	}

	resp := env.Client.Get(t, "/api/auth/verify?token="+rawToken)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("status: got %d want 303", resp.StatusCode)
	}
	if loc := resp.Header.Get("Location"); loc != "/login?error=invalid_or_expired_token" {
		t.Fatalf("location: got %q", loc)
	}
}

func TestMe_RequiresAuth(t *testing.T) {
	env := apitest.New(t)

	resp := env.Client.Get(t, "/api/me")
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status: got %d want 401", resp.StatusCode)
	}
}

func TestMe_AuthenticatedReturnsUser(t *testing.T) {
	env := apitest.New(t)
	resp := env.RequestAndConsumeMagicLink(t, testEmail)
	resp.Body.Close()

	me := env.Client.Get(t, "/api/me")
	var body struct {
		ID    int64   `json:"id"`
		Email string  `json:"email"`
		Role  *string `json:"role"`
	}
	apitest.DecodeJSON(t, me, &body)

	if body.Email != testEmail {
		t.Fatalf("email: got %q want %q", body.Email, testEmail)
	}
	if body.Role != nil {
		t.Fatalf("role: got %v want nil for fresh user", body.Role)
	}
}

func TestUpdateMe_RotatesSession(t *testing.T) {
	env := apitest.New(t)
	verify := env.RequestAndConsumeMagicLink(t, testEmail)
	verify.Body.Close()
	oldCookie := env.Client.CookieValue(t, apitest.SessionCookieName)
	if oldCookie == "" {
		t.Fatalf("expected session cookie after verify")
	}

	resp := env.Client.PatchJSON(t, "/api/me", map[string]string{"role": "parent"})
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("status: got %d want 204", resp.StatusCode)
	}
	newCookie := env.Client.CookieValue(t, apitest.SessionCookieName)
	if newCookie == "" || newCookie == oldCookie {
		t.Fatalf("session not rotated: old=%q new=%q", oldCookie, newCookie)
	}

	// The OLD session row must be DELETE'd from DB — not just the cookie
	// updated on the client. Otherwise an attacker holding the old cookie
	// could keep using it. Count == 1 means rotation deleted the prior row
	// before issuing the new one.
	var sessionCount int
	if err := env.DB.QueryRow(`SELECT count(*) FROM sessions`).Scan(&sessionCount); err != nil {
		t.Fatalf("count sessions: %v", err)
	}
	if sessionCount != 1 {
		t.Fatalf("session not rotated in DB: %d rows want 1", sessionCount)
	}

	// The new cookie works for /me.
	me := env.Client.Get(t, "/api/me")
	me.Body.Close()
	if me.StatusCode != http.StatusOK {
		t.Fatalf("rotated session should be valid; got %d", me.StatusCode)
	}
}

func TestLogout_ClearsSession(t *testing.T) {
	env := apitest.New(t)
	verify := env.RequestAndConsumeMagicLink(t, testEmail)
	verify.Body.Close()

	logout := env.Client.Post(t, "/api/auth/logout")
	logout.Body.Close()
	if logout.StatusCode != http.StatusNoContent {
		t.Fatalf("logout status: got %d want 204", logout.StatusCode)
	}

	// The session row must be DELETE'd from DB. Without this check the test
	// would still pass if DeleteByToken silently failed (the handler logs a
	// warn and continues) — the cookie jar would be empty so /me would 401
	// anyway, but an attacker who captured the cookie before logout could
	// still replay it via curl.
	var sessionCount int
	if err := env.DB.QueryRow(`SELECT count(*) FROM sessions`).Scan(&sessionCount); err != nil {
		t.Fatalf("count sessions: %v", err)
	}
	if sessionCount != 0 {
		t.Fatalf("session row not deleted: %d rows want 0", sessionCount)
	}

	me := env.Client.Get(t, "/api/me")
	defer me.Body.Close()
	if me.StatusCode != http.StatusUnauthorized {
		t.Fatalf("/me after logout: got %d want 401", me.StatusCode)
	}
}
