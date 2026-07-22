package card

import "time"

const day = 24 * time.Hour

// Rank is how well a learner knows a card: RankNew the day they meet it, up to
// RankMastered once they have answered it right often enough.
type Rank int16

// RankNew is where every card starts.
const RankNew Rank = 1

// intervals[r] is how long a card at rank r waits before coming back. Index 0
// is unused so the slice is indexed by rank directly, and the last entry is
// the last rank that still comes back.
//
// This slice is the single source of truth for how many ranks exist: adding a
// sixth rank means adding a duration here — no migration, no other edit. The
// values predate any real use and were never tested against a child (#43).
var intervals = [...]time.Duration{0, 1 * day, 3 * day, 7 * day, 14 * day}

// RankMastered is the top of the ladder. A card that reaches it has no due
// date: it never comes back, and it never drops back down.
const RankMastered = Rank(len(intervals))

// Schedule returns the rank and due date a card takes after being answered.
//
// This is a gentle Leitner variant: a miss costs one rank, not the whole
// ladder. A six-year-old who fumbles a card they have known for a month should
// not lose that month in one tap — the question is whether they keep coming
// back (#43).
//
// A nil due date means mastered, which is terminal: a card that got there
// stays there even if this is somehow called for it again.
func Schedule(current Rank, correct bool, now time.Time) (Rank, *time.Time) {
	if current >= RankMastered {
		return RankMastered, nil
	}
	next := current
	if correct {
		next++
	} else {
		next--
	}
	if next >= RankMastered {
		return RankMastered, nil
	}
	if next < RankNew {
		next = RankNew
	}
	due := now.Add(intervals[next])
	return next, &due
}
