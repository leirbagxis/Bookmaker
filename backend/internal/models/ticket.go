package models

import "time"

type TicketStatus string

const (
	TicketStatusPending  TicketStatus = "PENDING"
	TicketStatusWon      TicketStatus = "WON"
	TicketStatusLost     TicketStatus = "LOST"
	TicketStatusVoid     TicketStatus = "VOID"
	TicketStatusCanceled TicketStatus = "CANCELED"
)

type Ticket struct {
	ID          int64             `json:"-"`
	ExternalID  string            `json:"id"` // ID público (ex: SB-XXXX-XXXX)
	UserID      int64             `json:"userId"`
	Amount      float64           `json:"amount"`
	TotalOdds   float64           `json:"totalOdds"`
	PossibleWin float64           `json:"possibleWin"`
	Status      TicketStatus      `json:"status"`
	CreatedAt   time.Time         `json:"createdAt"`
	Selections  []TicketSelection `json:"selections,omitempty"`
}

type TicketSelection struct {
	ID            int64        `json:"-"` // ID interno do banco
	TicketID      int64        `json:"ticketId"`
	EventID       int64        `json:"eventId"`
	HomeTeam      string       `json:"homeTeam"`
	AwayTeam      string       `json:"awayTeam"`
	StartTime     string       `json:"startTime"` // Data/hora do jogo
	MarketID      string       `json:"marketId"`
	MarketName    string       `json:"marketName"`
	SelectionID   string       `json:"id"` // O frontend manda o ID da seleção (ex: "h", "a", "123") como 'id'
	SelectionName string       `json:"name"`
	Odds          float64      `json:"price"`
	Status        TicketStatus `json:"status"`
	HomeScore     *int         `json:"homeScore,omitempty"`
	AwayScore     *int         `json:"awayScore,omitempty"`
}
