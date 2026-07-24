package card

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store { return &Store{db: db} }

// InsertTx writes drafts as new cards for profileID, optionally filed under
// deckID. It takes a transaction rather than using the store's own pool
// because its one caller — saving a deck — must create the deck and its cards
// atomically, and this package owns every write to the cards table.
func InsertTx(ctx context.Context, tx *sql.Tx, profileID int64, deckID *int64, drafts []Draft) error {
	for _, d := range drafts {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO cards (profile_id, deck_id, question, answer)
			VALUES ($1, $2, $3, $4)
		`, profileID, deckID, d.Question, d.Answer); err != nil {
			return fmt.Errorf("insert card: %w", err)
		}
	}
	return nil
}

// DueByProfile returns the cards profileID has to answer now, oldest due date
// first. The profile must belong to userID: the join on profiles scopes the
// query, so a forged profile_id yields an empty list rather than someone
// else's cards. Mastered cards have a NULL due date and never match.
func (s *Store) DueByProfile(ctx context.Context, userID, profileID int64) ([]Card, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT c.id, c.profile_id, c.deck_id, c.question, c.answer, c.rank, c.due_at, c.created_at
		FROM cards c
		JOIN profiles p ON p.id = c.profile_id
		WHERE c.profile_id = $1 AND p.user_id = $2 AND c.due_at <= now()
		ORDER BY c.due_at, c.id
	`, profileID, userID)
	if err != nil {
		return nil, fmt.Errorf("query due cards: %w", err)
	}
	defer rows.Close()

	var cards []Card
	for rows.Next() {
		var c Card
		if err := rows.Scan(&c.ID, &c.ProfileID, &c.DeckID, &c.Question, &c.Answer,
			&c.Rank, &c.DueAt, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan due card: %w", err)
		}
		cards = append(cards, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate due cards: %w", err)
	}
	return cards, nil
}

// Review records how a card was answered and moves it along the schedule. It
// returns the rank before and after the answer — the caller logs the
// transition, which is what makes a scheduling problem legible in one line.
// The card must belong to userID, through its profile — a card that isn't
// theirs yields ErrNotFound, indistinguishable from one that doesn't exist.
//
// The read and the write share a transaction, and the row is locked between
// them: two devices answering the same card at once would otherwise both read
// the old rank and one update would be lost.
func (s *Store) Review(ctx context.Context, userID, cardID int64, correct bool) (before, after Rank, dueAt *time.Time, err error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, 0, nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	err = tx.QueryRowContext(ctx, `
		SELECT c.rank
		FROM cards c
		JOIN profiles p ON p.id = c.profile_id
		WHERE c.id = $1 AND p.user_id = $2
		FOR UPDATE OF c
	`, cardID, userID).Scan(&before)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, 0, nil, ErrNotFound
	}
	if err != nil {
		return 0, 0, nil, fmt.Errorf("load card rank: %w", err)
	}

	after, dueAt = Schedule(before, correct, time.Now())
	if _, err := tx.ExecContext(ctx, `
		UPDATE cards SET rank = $2, due_at = $3 WHERE id = $1
	`, cardID, after, dueAt); err != nil {
		return 0, 0, nil, fmt.Errorf("update card schedule: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return 0, 0, nil, fmt.Errorf("commit: %w", err)
	}
	return before, after, dueAt, nil
}
