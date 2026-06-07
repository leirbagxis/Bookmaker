package models

import "time"

type User struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Balance   float64   `json:"balance"`
	CreatedAt time.Time `json:"createdAt"`
}
