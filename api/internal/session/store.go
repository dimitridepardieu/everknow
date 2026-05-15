package session

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

var ErrNotFound = errors.New("session not found")

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store { return &Store{db: db} }

func (s *Store) Create(ctx context.Context, userID int64, token string, expiresAt time.Time, ipAddress, userAgent *string) (*Session, error) {
	var sess Session
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, token, expires_at, ip_address, user_agent, created_at, updated_at
	`, userID, token, expiresAt, ipAddress, userAgent).Scan(
		&sess.ID, &sess.UserID, &sess.Token, &sess.ExpiresAt,
		&sess.IPAddress, &sess.UserAgent, &sess.CreatedAt, &sess.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert session: %w", err)
	}
	return &sess, nil
}

func (s *Store) GetByToken(ctx context.Context, token string) (*Session, error) {
	var sess Session
	err := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, token, expires_at, ip_address, user_agent, created_at, updated_at
		FROM sessions
		WHERE token = $1 AND expires_at > now()
	`, token).Scan(
		&sess.ID, &sess.UserID, &sess.Token, &sess.ExpiresAt,
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

func (s *Store) DeleteByToken(ctx context.Context, token string) error {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE token = $1`, token); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}
