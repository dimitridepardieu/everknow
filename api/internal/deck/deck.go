// Package deck turns text a parent pasted into flashcards, and files the ones
// a human approves under a name.
//
// A deck is only that name: the cards themselves belong to the learner and
// outlive it (see package card, which owns them). Generated cards are
// transient — they travel back to the client, which holds them until the
// parent reviews them, and only the kept ones are saved.
package deck

import (
	"errors"
	"time"
)

// ErrProfileNotFound is returned by Store.Create when the target profile does
// not exist or does not belong to the requesting user. The two cases are not
// distinguished on purpose: revealing that someone else's profile exists is a
// leak.
var ErrProfileNotFound = errors.New("profile not found")

// Deck is a named set of cards owned by a profile.
type Deck struct {
	ID        int64
	ProfileID int64
	Name      string
	CreatedAt time.Time
}
