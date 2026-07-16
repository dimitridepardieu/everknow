package profile

import (
	"context"
	"database/sql"
	"fmt"
)

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store { return &Store{db: db} }

func (s *Store) Create(ctx context.Context, userID int64, name *string, age *int) (*Profile, error) {
	var p Profile
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO profiles (user_id, name, age)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, name, age, created_at, updated_at
	`, userID, name, age).Scan(&p.ID, &p.UserID, &p.Name, &p.Age, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create profile: %w", err)
	}
	return &p, nil
}

func (s *Store) ListByUser(ctx context.Context, userID int64) ([]*Profile, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, name, age, created_at, updated_at
		FROM profiles
		WHERE user_id = $1
		ORDER BY created_at
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list profiles by user: %w", err)
	}
	defer rows.Close()

	var profiles []*Profile
	for rows.Next() {
		var p Profile
		if err := rows.Scan(&p.ID, &p.UserID, &p.Name, &p.Age, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan profile: %w", err)
		}
		profiles = append(profiles, &p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate profiles: %w", err)
	}
	return profiles, nil
}
