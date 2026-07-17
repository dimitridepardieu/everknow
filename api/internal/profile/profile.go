package profile

import "time"

type Profile struct {
	ID        int64
	UserID    int64
	Name      *string
	Age       *int
	CreatedAt time.Time
	UpdatedAt time.Time
}
