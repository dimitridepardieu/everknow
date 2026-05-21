// Package ratelimit provides an in-memory sliding-window limiter, sufficient
// for a single API instance. When we scale to multiple replicas we will swap
// the backing map for Redis; the Limiter contract stays the same.
package ratelimit

import (
	"context"
	"sync"
	"time"
)

// Limiter caps the number of events for a given key within a rolling window.
// The zero value is not usable — construct via New. A nil *Limiter behaves
// as a no-op (every Allow returns true), so handlers can accept an optional
// limiter without nil-guards at every call site.
type Limiter struct {
	limit  int
	window time.Duration

	mu      sync.Mutex
	buckets map[string][]time.Time
}

// New constructs a Limiter and starts a background sweeper that removes
// keys whose entire window has aged out. The sweeper stops when ctx is
// done; pass a cancellable context (signal.NotifyContext in main, t.Context
// in tests) so the goroutine exits on shutdown.
func New(ctx context.Context, limit int, window time.Duration) *Limiter {
	l := &Limiter{
		limit:   limit,
		window:  window,
		buckets: make(map[string][]time.Time),
	}
	go l.runSweeper(ctx)
	return l
}

// Allow records an event for key if the rolling window has capacity. Returns
// (true, 0) when accepted; (false, retryAfter) when rejected, where
// retryAfter is the time until the oldest event in the window expires.
func (l *Limiter) Allow(key string) (bool, time.Duration) {
	if l == nil {
		return true, 0
	}
	now := time.Now()
	cutoff := now.Add(-l.window)

	l.mu.Lock()
	defer l.mu.Unlock()

	// Drop timestamps that have aged out of the window. The retained slice
	// represents events still "counted" against this key.
	stamps := l.buckets[key]
	kept := stamps[:0]
	for _, t := range stamps {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}

	if len(kept) >= l.limit {
		// retryAfter: when the oldest event will fall out of the window.
		retry := kept[0].Add(l.window).Sub(now)
		l.buckets[key] = kept
		return false, retry
	}

	l.buckets[key] = append(kept, now)
	return true, 0
}

// runSweeper periodically removes cold keys (last event older than window)
// so the buckets map doesn't grow unbounded as one-off IPs and emails
// accumulate. Tick cadence matches the window: finer is wasted work,
// coarser lets dead entries linger longer than necessary.
func (l *Limiter) runSweeper(ctx context.Context) {
	t := time.NewTicker(l.window)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			l.sweep()
		}
	}
}

func (l *Limiter) sweep() {
	cutoff := time.Now().Add(-l.window)
	l.mu.Lock()
	defer l.mu.Unlock()
	for k, stamps := range l.buckets {
		if len(stamps) == 0 || stamps[len(stamps)-1].Before(cutoff) {
			delete(l.buckets, k)
		}
	}
}
