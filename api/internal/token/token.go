package token

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
)

// New returns a 32-byte cryptographically random token, base64url-encoded
// (43 chars, URL-safe, no padding). 256 bits of entropy. Suitable as a
// session cookie value or a short-lived verification token.
func New() (string, error) {
	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", fmt.Errorf("read rand: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b[:]), nil
}

// Hash returns the sha256 of a token. Stored in DB; the raw token only
// ever exists in transit (cookie value, or magic-link URL in an inbox).
func Hash(s string) []byte {
	h := sha256.Sum256([]byte(s))
	return h[:]
}
