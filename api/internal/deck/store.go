package deck

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"flashcardacademy/api/internal/card"
)

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store { return &Store{db: db} }

// Create saves a new deck and its cards for profileID, in one transaction.
// The profile must belong to userID: the INSERT is guarded by a WHERE EXISTS
// on profiles.user_id, so a profile that isn't the user's inserts no row and
// yields ErrProfileNotFound — no separate ownership query, and no way to probe
// whether another user's profile exists.
func (s *Store) Create(ctx context.Context, userID, profileID int64, name string, drafts []card.Draft) (*Deck, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	var d Deck
	err = tx.QueryRowContext(ctx, `
		INSERT INTO decks (profile_id, name)
		SELECT $1, $2
		WHERE EXISTS (SELECT 1 FROM profiles WHERE id = $1 AND user_id = $3)
		RETURNING id, profile_id, name, created_at
	`, profileID, name, userID).Scan(&d.ID, &d.ProfileID, &d.Name, &d.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrProfileNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("insert deck: %w", err)
	}

	// The cards table belongs to package card, including this write.
	if err := card.InsertTx(ctx, tx, profileID, &d.ID, drafts); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return &d, nil
}
