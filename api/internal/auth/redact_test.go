package auth

import (
	"testing"

	"everknow/api/internal/config"
)

// Internal test: redactEmail is unexported and the external handlers_test
// package can only reach it through the /api/auth/request path, which drags
// in the whole server harness. A local package auth test keeps this focused
// on the masking logic itself.

func TestHandlers_redactEmail(t *testing.T) {
	t.Run("dev passes through", func(t *testing.T) {
		h := &Handlers{cfg: &config.Config{Env: "dev"}}
		const in = "alice@example.com"
		if got := h.redactEmail(in); got != in {
			t.Fatalf("dev: got %q, want passthrough %q", got, in)
		}
	})

	t.Run("prod masks", func(t *testing.T) {
		h := &Handlers{cfg: &config.Config{Env: "prod"}}
		cases := []struct {
			name string
			in   string
			want string
		}{
			// Happy path: 2+ char local-part keeps its first rune.
			{"regular", "alice@example.com", "a***@example.com"},
			{"two-char local", "ab@example.com", "a***@example.com"},

			// Single-char local-part collapses to full opacity: a "a***@b.com"
			// masking would reveal 100% of the local-part's information.
			{"single-char local", "a@b.com", "***"},

			// Multi-byte first rune must not be split at a byte boundary.
			{"unicode local", "éléonore@example.com", "é***@example.com"},

			// Nothing to mask meaningfully -> full opacity.
			{"empty", "", "***"},
			{"no at sign", "no-at-sign", "***"},
			{"leading at", "@example.com", "***"},
		}

		for _, tc := range cases {
			t.Run(tc.name, func(t *testing.T) {
				if got := h.redactEmail(tc.in); got != tc.want {
					t.Fatalf("in=%q: got %q, want %q", tc.in, got, tc.want)
				}
			})
		}
	})
}
