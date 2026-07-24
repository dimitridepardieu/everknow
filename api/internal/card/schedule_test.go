package card

import (
	"testing"
	"time"
)

// now is a fixed instant so the expected due dates are exact. It is 18:00 UTC,
// which is 20:00 in Europe/Paris (CEST) on the 22nd — comfortably the same
// local day, so the grid lands on the 22nd + N.
var now = time.Date(2026, 7, 22, 18, 0, 0, 0, time.UTC)

// wantDue is 06:00 Europe/Paris on the given July day — where the daily grid
// puts a card due `day - 22` days after now.
func wantDue(t *testing.T, july int) time.Time {
	t.Helper()
	return time.Date(2026, 7, july, dayStartHour, 0, 0, 0, trainingLocation)
}

func TestSchedule_CorrectClimbsOneRank(t *testing.T) {
	tests := []struct {
		current  Rank
		want     Rank
		dueOnDay int // July day the card should next come due
	}{
		{RankNew, 2, 25}, // +3 days
		{2, 3, 29},       // +7 days
		{3, 4, 5 + 31},   // +14 days → August 5, i.e. July "36"
	}
	for _, tt := range tests {
		rank, dueAt := Schedule(tt.current, true, now)
		if rank != tt.want {
			t.Errorf("rank from %d correct: got %d want %d", tt.current, rank, tt.want)
		}
		if dueAt == nil {
			t.Fatalf("due date from %d correct: got nil", tt.current)
		}
		if want := wantDue(t, tt.dueOnDay); !dueAt.Equal(want) {
			t.Errorf("due from %d correct: got %v want %v", tt.current, dueAt.In(trainingLocation), want)
		}
	}
}

func TestSchedule_WrongDropsOneRankOnly(t *testing.T) {
	// The whole point of the gentle Leitner variant: a miss at rank 4 lands on
	// 3, not back at the bottom — so it comes back in 7 days, not tomorrow.
	rank, dueAt := Schedule(4, false, now)
	if rank != 3 {
		t.Fatalf("rank: got %d want 3", rank)
	}
	if want := wantDue(t, 29); dueAt == nil || !dueAt.Equal(want) {
		t.Fatalf("due date: got %v want %v", dueAt, want)
	}
}

func TestSchedule_WrongAtBottomStaysAtBottom(t *testing.T) {
	rank, dueAt := Schedule(RankNew, false, now)
	if rank != RankNew {
		t.Fatalf("rank: got %d want %d", rank, RankNew)
	}
	if want := wantDue(t, 23); dueAt == nil || !dueAt.Equal(want) {
		t.Fatalf("due date: got %v want %v (tomorrow morning)", dueAt, want)
	}
}

// The grid's whole reason for existing: two answers on the same local day land
// on the same due instant, whatever the hour — no drift, no card hiding just
// before yesterday's time (#43).
func TestSchedule_SameDayAnswersLandOnTheSameDue(t *testing.T) {
	morning := time.Date(2026, 7, 22, 6, 30, 0, 0, time.UTC)  // 08:30 Paris
	evening := time.Date(2026, 7, 22, 20, 45, 0, 0, time.UTC) // 22:45 Paris

	_, a := Schedule(RankNew, true, morning)
	_, b := Schedule(RankNew, true, evening)
	if a == nil || b == nil || !a.Equal(*b) {
		t.Fatalf("same-day answers gave different due dates: %v vs %v", a, b)
	}
}

func TestSchedule_LastCorrectAnswerMasters(t *testing.T) {
	rank, dueAt := Schedule(RankMastered-1, true, now)
	if rank != RankMastered {
		t.Fatalf("rank: got %d want %d", rank, RankMastered)
	}
	if dueAt != nil {
		t.Fatalf("due date: got %v want nil (a mastered card never comes back)", dueAt)
	}
}

func TestSchedule_MasteredIsTerminal(t *testing.T) {
	// Even answered wrong: "elles ne redescendront plus".
	rank, dueAt := Schedule(RankMastered, false, now)
	if rank != RankMastered || dueAt != nil {
		t.Fatalf("got rank %d due %v, want %d and nil", rank, dueAt, RankMastered)
	}
}

// The ladder's length is defined by the interval table alone, so adding a rank
// stays a one-line change. This locks that the two never drift apart.
func TestRankMasteredMatchesIntervalTable(t *testing.T) {
	if got := Rank(len(intervalDays)); got != RankMastered {
		t.Fatalf("RankMastered: got %d want %d", RankMastered, got)
	}
	if intervalDays[RankMastered-1] == 0 {
		t.Fatal("the last rank below mastered has no interval")
	}
}
