// Package ratelimit provides an in-memory sliding-window limiter, sufficient
// for a single API instance. When we scale to multiple replicas we will swap
// the backing map for Redis; the Limiter contract stays the same.
package ratelimit

import (
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

func New(limit int, window time.Duration) *Limiter {
	return &Limiter{
		limit:   limit,
		window:  window,
		buckets: make(map[string][]time.Time),
	}
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
