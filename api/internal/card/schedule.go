package card

import "time"

// Rank is how well a learner knows a card: RankNew the day they meet it, up to
// RankMastered once they have answered it right often enough.
type Rank int16

// RankNew is where every card starts.
const RankNew Rank = 1

// intervalDays[r] is how many days a card at rank r waits before coming back.
// Index 0 is unused so the slice is indexed by rank directly, and the last
// entry is the last rank that still comes back.
//
// This slice is the single source of truth for how many ranks exist: adding a
// sixth rank means adding a day count here — no migration, no other edit. The
// values predate any real use and were never tested against a child (#43).
var intervalDays = [...]int{0, 1, 3, 7, 14}

// RankMastered is the top of the ladder. A card that reaches it has no due
// date: it never comes back, and it never drops back down.
const RankMastered = Rank(len(intervalDays))

// Due dates snap to a daily grid: a card that earns N days comes due at
// dayStartHour on the N-th day out, in trainingLocation, and stays due all day.
// So a card is ready when the child picks up the phone in the morning, not 24h
// to the second after the last session — which otherwise lets the schedule
// drift later every day and hides a card from a child who opens the app a few
// minutes before yesterday's time (#43).
//
// Prototype: one family in France. Per-account timezone is MVP work — a family
// abroad would need its own. Loaded via MustLoadLocation like regexp.MustCompile:
// with time/tzdata embedded in main, a valid name cannot fail, so a failure here
// is a build fault, not a runtime input.
const dayStartHour = 6

var trainingLocation = mustLoadLocation("Europe/Paris")

func mustLoadLocation(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		panic("card: load training location: " + err.Error())
	}
	return loc
}

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
	due := dueDate(now, intervalDays[next])
	return next, &due
}

// dueDate returns dayStartHour on the day `days` after now's local date, in the
// training timezone. time.Date normalises the day overflow (month and year
// boundaries) and applies the correct DST offset, so 6am stays 6am in July and
// in January.
func dueDate(now time.Time, days int) time.Time {
	y, m, d := now.In(trainingLocation).Date()
	return time.Date(y, m, d+days, dayStartHour, 0, 0, 0, trainingLocation)
}
