package card

import (
	"testing"
	"time"
)

// now is a fixed instant so the expected due dates are exact, not approximate.
var now = time.Date(2026, 7, 22, 18, 0, 0, 0, time.UTC)

func TestSchedule_CorrectClimbsOneRank(t *testing.T) {
	tests := []struct {
		current Rank
		want    Rank
		wait    time.Duration
	}{
		{RankNew, 2, 3 * day},
		{2, 3, 7 * day},
		{3, 4, 14 * day},
	}
	for _, tt := range tests {
		rank, dueAt := Schedule(tt.current, true, now)
		if rank != tt.want {
			t.Errorf("rank from %d correct: got %d want %d", tt.current, rank, tt.want)
		}
		if dueAt == nil {
			t.Fatalf("due date from %d correct: got nil want %v later", tt.current, tt.wait)
		}
		if got := dueAt.Sub(now); got != tt.wait {
			t.Errorf("wait from %d correct: got %v want %v", tt.current, got, tt.wait)
		}
	}
}

func TestSchedule_WrongDropsOneRankOnly(t *testing.T) {
	// The whole point of the gentle Leitner variant: a miss at rank 4 lands on
	// 3, not back at the bottom.
	rank, dueAt := Schedule(4, false, now)
	if rank != 3 {
		t.Fatalf("rank: got %d want 3", rank)
	}
	if dueAt == nil || dueAt.Sub(now) != 7*day {
		t.Fatalf("due date: got %v want %v later", dueAt, 7*day)
	}
}

func TestSchedule_WrongAtBottomStaysAtBottom(t *testing.T) {
	rank, dueAt := Schedule(RankNew, false, now)
	if rank != RankNew {
		t.Fatalf("rank: got %d want %d", rank, RankNew)
	}
	if dueAt == nil || dueAt.Sub(now) != 1*day {
		t.Fatalf("due date: got %v want a day later", dueAt)
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
	if got := Rank(len(intervals)); got != RankMastered {
		t.Fatalf("RankMastered: got %d want %d", RankMastered, got)
	}
	if intervals[RankMastered-1] == 0 {
		t.Fatal("the last rank below mastered has no interval")
	}
}
