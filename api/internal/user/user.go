package user

import "time"

const (
	RoleParent  = "parent"
	RoleStudent = "student"
)

type User struct {
	ID            int64
	Name          *string
	Email         string
	EmailVerified bool
	Role          *string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func IsValidRole(r string) bool {
	return r == RoleParent || r == RoleStudent
}
