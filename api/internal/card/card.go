// Package card owns flashcards: their content, their spaced-repetition state,
// and every SQL statement that touches the cards table.
//
// A card is independent. It belongs to a learner, not to a deck: it carries
// its own profile_id, its own rank and its own due date, and it outlives the
// deck it was filed under. A deck is a name laid over a set of cards — see
// package deck, which depends on this one and not the reverse.
package card

import (
	"errors"
	"time"
)

// ErrNotFound is returned when a card does not exist or does not belong to the
// requesting user. The two cases are not distinguished on purpose: revealing
// that someone else's card exists is a leak.
var ErrNotFound = errors.New("card not found")

// Draft is a card's content with no identity — as the model generated it, or
// on its way into the database. It only becomes a Card once saved.
type Draft struct {
	Question string
	Answer   string
}

// Card is a saved flashcard and everything the schedule knows about it.
// DeckID is nil for a card that sits in no deck; DueAt is nil once the card is
// mastered and stops coming back.
type Card struct {
	ID        int64
	ProfileID int64
	DeckID    *int64
	Question  string
	Answer    string
	Rank      Rank
	DueAt     *time.Time
	CreatedAt time.Time
}
