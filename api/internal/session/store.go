package session

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"flashcardacademy/api/internal/token"
)

var ErrNotFound = errors.New("session not found")

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store { return &Store{db: db} }

// Create stores the token's sha256 hash; the raw value lives only in the
// client cookie. This way a DB read alone cannot impersonate users.
//
// ipAddress is *string because extractClientIP returns nil when no IP can
// be parsed (proxy mis-config, direct tests). userAgent is plain string —
// the header is always readable (empty if absent), so nil would not be
// distinguishable from "" semantically.
func (s *Store) Create(ctx context.Context, userID int64, rawToken string, expiresAt time.Time, ipAddress *string, userAgent string) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5)
	`, userID, token.Hash(rawToken), expiresAt, ipAddress, userAgent)
	if err != nil {
		return fmt.Errorf("insert session: %w", err)
	}
	return nil
}

func (s *Store) GetByToken(ctx context.Context, rawToken string) (*Session, error) {
	var sess Session
	err := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, expires_at, ip_address, user_agent, created_at, updated_at
		FROM sessions
		WHERE token = $1 AND expires_at > now()
	`, token.Hash(rawToken)).Scan(
		&sess.ID, &sess.UserID, &sess.ExpiresAt,
		&sess.IPAddress, &sess.UserAgent, &sess.CreatedAt, &sess.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query session: %w", err)
	}
	return &sess, nil
}

func (s *Store) DeleteByToken(ctx context.Context, rawToken string) error {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE token = $1`, token.Hash(rawToken)); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}
