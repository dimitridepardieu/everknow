package user

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("user not found")

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store { return &Store{db: db} }

func (s *Store) FindByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, email, email_verified, role, created_at, updated_at
		FROM users
		WHERE email = $1
	`, email).Scan(&u.ID, &u.Name, &u.Email, &u.EmailVerified, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find user by email: %w", err)
	}
	return &u, nil
}

func (s *Store) FindByID(ctx context.Context, id int64) (*User, error) {
	var u User
	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, email, email_verified, role, created_at, updated_at
		FROM users
		WHERE id = $1
	`, id).Scan(&u.ID, &u.Name, &u.Email, &u.EmailVerified, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find user by id: %w", err)
	}
	return &u, nil
}

func (s *Store) Create(ctx context.Context, email string) (*User, error) {
	var u User
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO users (email, email_verified)
		VALUES ($1, true)
		RETURNING id, name, email, email_verified, role, created_at, updated_at
	`, email).Scan(&u.ID, &u.Name, &u.Email, &u.EmailVerified, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	return &u, nil
}

func (s *Store) UpdateRole(ctx context.Context, id int64, role string) error {
	res, err := s.db.ExecContext(ctx, `
		UPDATE users SET role = $1, updated_at = now() WHERE id = $2
	`, role, id)
	if err != nil {
		return fmt.Errorf("update user role: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}
