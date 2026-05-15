package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

var ErrNotFound = errors.New("verification not found or expired")

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Create(ctx context.Context, identifier string, tokenHash []byte, expiresAt time.Time) error {
	if _, err := s.db.ExecContext(ctx, `
		INSERT INTO verifications (identifier, value, expires_at)
		VALUES ($1, $2, $3)
	`, identifier, tokenHash, expiresAt); err != nil {
		return fmt.Errorf("insert verification: %w", err)
	}
	return nil
}

// ConsumeByTokenHash atomically finds a non-expired verification by its
// hashed token and deletes it, returning the identifier (the email). Uses
// DELETE ... RETURNING so there's no race window between SELECT and DELETE.
func (s *Store) ConsumeByTokenHash(ctx context.Context, tokenHash []byte) (string, error) {
	var identifier string
	err := s.db.QueryRowContext(ctx, `
		DELETE FROM verifications
		WHERE value = $1 AND expires_at > now()
		RETURNING identifier
	`, tokenHash).Scan(&identifier)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", fmt.Errorf("consume verification: %w", err)
	}
	return identifier, nil
}
