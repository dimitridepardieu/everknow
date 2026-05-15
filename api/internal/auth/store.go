package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

var ErrVerificationNotFound = errors.New("verification not found or expired")

type VerificationStore struct {
	db *sql.DB
}

func NewVerificationStore(db *sql.DB) *VerificationStore {
	return &VerificationStore{db: db}
}

func (s *VerificationStore) Create(ctx context.Context, identifier string, value []byte, expiresAt time.Time) error {
	if _, err := s.db.ExecContext(ctx, `
		INSERT INTO verifications (identifier, value, expires_at)
		VALUES ($1, $2, $3)
	`, identifier, value, expiresAt); err != nil {
		return fmt.Errorf("insert verification: %w", err)
	}
	return nil
}

// ConsumeByValue atomically finds a non-expired verification by its hashed
// value and deletes it, returning the identifier (the email). Uses
// DELETE ... RETURNING so there's no race window between SELECT and DELETE.
func (s *VerificationStore) ConsumeByValue(ctx context.Context, value []byte) (string, error) {
	var identifier string
	err := s.db.QueryRowContext(ctx, `
		DELETE FROM verifications
		WHERE value = $1 AND expires_at > now()
		RETURNING identifier
	`, value).Scan(&identifier)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrVerificationNotFound
	}
	if err != nil {
		return "", fmt.Errorf("consume verification: %w", err)
	}
	return identifier, nil
}
