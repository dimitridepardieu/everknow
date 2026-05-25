package user

import "time"

const (
	RoleFamily     = "family"
	RoleIndividual = "individual"
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
	return r == RoleFamily || r == RoleIndividual
}
