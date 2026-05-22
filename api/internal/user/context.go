package user

import "context"

// contextKey is unexported to prevent collisions with other packages
// writing to the request context.
type contextKey struct{}

// NewContext returns a derived context carrying u. Middleware uses it to
// inject the authenticated user; handlers read it back via FromContext.
func NewContext(ctx context.Context, u *User) context.Context {
	return context.WithValue(ctx, contextKey{}, u)
}

// FromContext returns the user attached to ctx, or nil if the request is
// anonymous (e.g. the Auth middleware found no valid session).
func FromContext(ctx context.Context) *User {
	u, _ := ctx.Value(contextKey{}).(*User)
	return u
}
