package models

import "encoding/json"

type ClientMessage struct {
	Type       string            `json:"type"`
	EventID    *int64            `json:"event_id,omitempty"`
	Username   string            `json:"username,omitempty"`
	Amount     float64           `json:"amount,omitempty"`
	Selections []TicketSelection `json:"selections,omitempty"`
}

type ServerMessage struct {
	Type    string          `json:"type"`
	EventID int64           `json:"event_id,omitempty"`
	Data    json.RawMessage `json:"data,omitempty"`
	Message string          `json:"message,omitempty"`
}
