// Package deck turns text a parent pasted into flashcards.
//
// Generation is not persisted here: the cards travel back to the client,
// which holds them until the parent approves them (see #42, which owns the
// decks/cards tables and the save).
package deck

// Card is one generated flashcard, before any human has approved it.
type Card struct {
	Question string
	Answer   string
	// Category names the theme in a word or two ("Astronomie"). Cards from
	// one generation usually share it; the review screen shows it as a pill.
	Category string
}
