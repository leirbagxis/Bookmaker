package db

import (
	"context"
	"database/sql"
	"time"

	"superbet/backend/internal/models"
)

type DB struct {
	postgres *PostgresDB
}

func NewPostgresWrapper(databaseURL string) (*DB, error) {
	postgres, err := NewPostgres(databaseURL)
	if err != nil {
		return nil, err
	}

	return &DB{postgres: postgres}, nil
}

func (db *DB) Close() {
	db.postgres.Close()
}

func (db *DB) GetPool() *PostgresDB {
	return db.postgres
}

func (db *DB) GetUserByUsername(username string) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	q := `SELECT id, username, balance, created_at FROM users WHERE username = $1`
	var u models.User
	var createdAt time.Time
	err := db.postgres.pool.QueryRow(ctx, q, username).Scan(&u.ID, &u.Username, &u.Balance, &createdAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt
	return &u, nil
}

func (db *DB) CreateUser(username string, initialBalance float64) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	q := `INSERT INTO users (username, balance) VALUES ($1, $2) RETURNING id, username, balance, created_at`
	var u models.User
	var createdAt time.Time
	err := db.postgres.pool.QueryRow(ctx, q, username, initialBalance).Scan(&u.ID, &u.Username, &u.Balance, &createdAt)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt
	return &u, nil
}

func (db *DB) UpdateUserBalance(ctx context.Context, userID int64, amount float64) error {
	q := `UPDATE users SET balance = balance + $1 WHERE id = $2`
	_, err := db.postgres.pool.Exec(ctx, q, amount, userID)
	return err
}

func (db *DB) SaveTicket(ctx context.Context, userID int64, amount, totalOdds, possibleWin float64, selections []models.TicketSelection, idempotencyKey string) (string, error) {
	// First, check if ticket with this idempotency key already exists to avoid unnecessary transactions
	existingTicket, err := db.GetTicketByIdempotencyKey(ctx, userID, idempotencyKey)
	if err == nil && existingTicket != nil {
		return existingTicket.ExternalID, nil // Return existing without error
	}

	tx, err := db.postgres.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	externalID := generateBookingCode()

	// 1. Salvar Ticket
	qTicket := `INSERT INTO tickets (external_id, user_id, amount, total_odds, possible_win, idempotency_key) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`
	var ticketID int64
	if err := tx.QueryRow(ctx, qTicket, externalID, userID, amount, totalOdds, possibleWin, idempotencyKey).Scan(&ticketID); err != nil {
		return "", err
	}

	// 2. Descontar saldo
	if _, err := tx.Exec(ctx, `UPDATE users SET balance = balance - $1 WHERE id = $2`, amount, userID); err != nil {
		return "", err
	}

	// 3. Salvar Seleções
	qSel := `INSERT INTO ticket_selections (ticket_id, event_id, home_team, away_team, start_time, market_id, market_name, selection_id, selection_name, odds) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	for _, s := range selections {
		if _, err := tx.Exec(ctx, qSel, ticketID, s.EventID, s.HomeTeam, s.AwayTeam, s.StartTime, s.MarketID, s.MarketName, s.SelectionID, s.SelectionName, s.Odds); err != nil {
			return "", err
		}
	}

	return externalID, tx.Commit(ctx)
}

func (db *DB) GetTicketByIdempotencyKey(ctx context.Context, userID int64, idempotencyKey string) (*models.Ticket, error) {
	if idempotencyKey == "" {
		return nil, sql.ErrNoRows
	}
	q := `SELECT id, external_id, user_id, amount, total_odds, possible_win, status, created_at FROM tickets WHERE user_id = $1 AND idempotency_key = $2`
	var t models.Ticket
	var createdAt time.Time
	err := db.postgres.pool.QueryRow(ctx, q, userID, idempotencyKey).Scan(&t.ID, &t.ExternalID, &t.UserID, &t.Amount, &t.TotalOdds, &t.PossibleWin, &t.Status, &createdAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	t.CreatedAt = createdAt
	return &t, nil
}

func (db *DB) GetPendingTickets() ([]models.Ticket, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	q := `SELECT id, external_id, user_id, amount, total_odds, possible_win, status, created_at FROM tickets WHERE status = 'PENDING'`
	rows, err := db.postgres.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []models.Ticket
	for rows.Next() {
		var t models.Ticket
		var createdAt time.Time
		if err := rows.Scan(&t.ID, &t.ExternalID, &t.UserID, &t.Amount, &t.TotalOdds, &t.PossibleWin, &t.Status, &createdAt); err != nil {
			return nil, err
		}
		t.CreatedAt = createdAt
		tickets = append(tickets, t)
	}

	for i := range tickets {
		sels, err := db.getTicketSelections(tickets[i].ID)
		if err != nil {
			return nil, err
		}
		tickets[i].Selections = sels
	}
	return tickets, nil
}

func (db *DB) getTicketSelections(ticketID int64) ([]models.TicketSelection, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	q := `SELECT id, ticket_id, event_id, home_team, away_team, start_time, market_id, market_name, selection_id, selection_name, odds, status, home_score, away_score FROM ticket_selections WHERE ticket_id = $1`
	rows, err := db.postgres.pool.Query(ctx, q, ticketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sels []models.TicketSelection
	for rows.Next() {
		var s models.TicketSelection
		var startTime time.Time
		var odds float64
		if err := rows.Scan(&s.ID, &s.TicketID, &s.EventID, &s.HomeTeam, &s.AwayTeam, &startTime, &s.MarketID, &s.MarketName, &s.SelectionID, &s.SelectionName, &odds, &s.Status, &s.HomeScore, &s.AwayScore); err != nil {
			return nil, err
		}
		s.StartTime = startTime.Format(time.RFC3339)
		s.Odds = odds
		sels = append(sels, s)
	}
	return sels, nil
}

func (db *DB) UpdateTicketStatus(ctx context.Context, ticketID int64, status models.TicketStatus) error {
	q := `UPDATE tickets SET status = $1 WHERE id = $2`
	_, err := db.postgres.pool.Exec(ctx, q, string(status), ticketID)
	return err
}

func (db *DB) UpdateSelectionStatus(ctx context.Context, selID int64, status models.TicketStatus) error {
	q := `UPDATE ticket_selections SET status = $1 WHERE id = $2`
	_, err := db.postgres.pool.Exec(ctx, q, string(status), selID)
	return err
}

func (db *DB) GetTicketsByUser(userID int64) ([]models.Ticket, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	q := `SELECT id, external_id, user_id, amount, total_odds, possible_win, status, created_at FROM tickets WHERE user_id = $1 ORDER BY created_at DESC`
	rows, err := db.postgres.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []models.Ticket
	for rows.Next() {
		var t models.Ticket
		var createdAt time.Time
		if err := rows.Scan(&t.ID, &t.ExternalID, &t.UserID, &t.Amount, &t.TotalOdds, &t.PossibleWin, &t.Status, &createdAt); err != nil {
			return nil, err
		}
		t.CreatedAt = createdAt
		tickets = append(tickets, t)
	}

	for i := range tickets {
		sels, err := db.getTicketSelections(tickets[i].ID)
		if err != nil {
			return nil, err
		}
		tickets[i].Selections = sels
	}
	return tickets, nil
}

func generateBookingCode() string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	seed := time.Now().UnixNano()
	res := make([]byte, 8)
	for i := range res {
		seed = seed*1103515245 + 12345
		idx := (seed / 65536) % int64(len(chars))
		if idx < 0 {
			idx = -idx
		}
		res[i] = chars[idx]
	}
	return "SB-" + string(res[:4]) + "-" + string(res[4:])
}

func (db *DB) GetUserByID(ctx context.Context, userID int64) (*models.User, error) {
	q := `SELECT id, username, balance, created_at FROM users WHERE id = $1`
	var u models.User
	var createdAt time.Time
	err := db.postgres.pool.QueryRow(ctx, q, userID).Scan(&u.ID, &u.Username, &u.Balance, &createdAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	u.CreatedAt = createdAt
	return &u, nil
}

func (db *DB) GetTicketByExternalID(ctx context.Context, externalID string) (*models.Ticket, error) {
	q := `SELECT id, external_id, user_id, amount, total_odds, possible_win, status, created_at FROM tickets WHERE external_id = $1`
	var t models.Ticket
	var createdAt time.Time
	err := db.postgres.pool.QueryRow(ctx, q, externalID).Scan(&t.ID, &t.ExternalID, &t.UserID, &t.Amount, &t.TotalOdds, &t.PossibleWin, &t.Status, &createdAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	t.CreatedAt = createdAt

	sels, err := db.getTicketSelections(t.ID)
	if err != nil {
		return nil, err
	}
	t.Selections = sels

	return &t, nil
}

func (db *DB) GetTicketByID(ctx context.Context, ticketID int64) (*models.Ticket, error) {
	q := `SELECT id, external_id, user_id, amount, total_odds, possible_win, status, created_at FROM tickets WHERE id = $1`
	var t models.Ticket
	var createdAt time.Time
	err := db.postgres.pool.QueryRow(ctx, q, ticketID).Scan(&t.ID, &t.ExternalID, &t.UserID, &t.Amount, &t.TotalOdds, &t.PossibleWin, &t.Status, &createdAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	t.CreatedAt = createdAt

	sels, err := db.getTicketSelections(t.ID)
	if err != nil {
		return nil, err
	}
	t.Selections = sels

	return &t, nil
}

func (db *DB) GetUserBalance(ctx context.Context, userID int64) (float64, error) {
	q := `SELECT balance FROM users WHERE id = $1`
	var balance float64
	err := db.postgres.pool.QueryRow(ctx, q, userID).Scan(&balance)
	if err != nil {
		return 0, err
	}
	return balance, nil
}

func (db *DB) UpdateUserBalanceDirect(ctx context.Context, userID int64, amount float64) error {
	q := `UPDATE users SET balance = balance + $1 WHERE id = $2`
	_, err := db.postgres.pool.Exec(ctx, q, amount, userID)
	return err
}

func (db *DB) GetAllTickets(ctx context.Context) ([]models.Ticket, error) {
	q := `SELECT id, external_id, user_id, amount, total_odds, possible_win, status, created_at FROM tickets ORDER BY created_at DESC`
	rows, err := db.postgres.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []models.Ticket
	for rows.Next() {
		var t models.Ticket
		var createdAt time.Time
		if err := rows.Scan(&t.ID, &t.ExternalID, &t.UserID, &t.Amount, &t.TotalOdds, &t.PossibleWin, &t.Status, &createdAt); err != nil {
			return nil, err
		}
		t.CreatedAt = createdAt
		tickets = append(tickets, t)
	}

	for i := range tickets {
		sels, err := db.getTicketSelections(tickets[i].ID)
		if err != nil {
			return nil, err
		}
		tickets[i].Selections = sels
	}
	return tickets, nil
}

func (db *DB) GetTicketWithSelections(ctx context.Context, ticketID int64) (*models.Ticket, error) {
	return db.GetTicketByID(ctx, ticketID)
}

func (db *DB) GetSelectionsByTicketID(ctx context.Context, ticketID int64) ([]models.TicketSelection, error) {
	return db.getTicketSelections(ticketID)
}

func (db *DB) UpdateSelectionStatusBatch(ctx context.Context, selections []models.TicketSelection) error {
	if len(selections) == 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := db.postgres.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	q := `UPDATE ticket_selections SET status = $1, home_score = $2, away_score = $3 WHERE id = $4`
	for _, s := range selections {
		if _, err := tx.Exec(ctx, q, string(s.Status), s.HomeScore, s.AwayScore, s.ID); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (db *DB) UpdateTicketStatusBatch(ctx context.Context, tickets []models.Ticket) error {
	if len(tickets) == 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := db.postgres.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	q := `UPDATE tickets SET status = $1 WHERE id = $2`
	for _, t := range tickets {
		if _, err := tx.Exec(ctx, q, string(t.Status), t.ID); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (db *DB) GetSelectionByID(ctx context.Context, selID int64) (*models.TicketSelection, error) {
	q := `SELECT id, ticket_id, event_id, home_team, away_team, start_time, market_id, market_name, selection_id, selection_name, odds, status, home_score, away_score FROM ticket_selections WHERE id = $1`
	var s models.TicketSelection
	err := db.postgres.pool.QueryRow(ctx, q, selID).Scan(&s.ID, &s.TicketID, &s.EventID, &s.HomeTeam, &s.AwayTeam, &s.StartTime, &s.MarketID, &s.MarketName, &s.SelectionID, &s.SelectionName, &s.Odds, &s.Status, &s.HomeScore, &s.AwayScore)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (db *DB) GetSelectionsByEventID(ctx context.Context, eventID int64) ([]models.TicketSelection, error) {
	q := `SELECT id, ticket_id, event_id, home_team, away_team, start_time, market_id, market_name, selection_id, selection_name, odds, status, home_score, away_score FROM ticket_selections WHERE event_id = $1`
	rows, err := db.postgres.pool.Query(ctx, q, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sels []models.TicketSelection
	for rows.Next() {
		var s models.TicketSelection
		if err := rows.Scan(&s.ID, &s.TicketID, &s.EventID, &s.HomeTeam, &s.AwayTeam, &s.StartTime, &s.MarketID, &s.MarketName, &s.SelectionID, &s.SelectionName, &s.Odds, &s.Status, &s.HomeScore, &s.AwayScore); err != nil {
			return nil, err
		}
		sels = append(sels, s)
	}
	return sels, nil
}

func (db *DB) GetPendingTicketsByEventID(ctx context.Context, eventID int64) ([]models.Ticket, error) {
	q := `
	SELECT t.id, t.external_id, t.user_id, t.amount, t.total_odds, t.possible_win, t.status, t.created_at 
	FROM tickets t 
	INNER JOIN ticket_selections ts ON t.id = ts.ticket_id 
	WHERE ts.event_id = $1 AND t.status = 'PENDING'
	`
	rows, err := db.postgres.pool.Query(ctx, q, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []models.Ticket
	for rows.Next() {
		var t models.Ticket
		var createdAt time.Time
		if err := rows.Scan(&t.ID, &t.ExternalID, &t.UserID, &t.Amount, &t.TotalOdds, &t.PossibleWin, &t.Status, &createdAt); err != nil {
			return nil, err
		}
		t.CreatedAt = createdAt
		tickets = append(tickets, t)
	}

	for i := range tickets {
		sels, err := db.getTicketSelections(tickets[i].ID)
		if err != nil {
			return nil, err
		}
		tickets[i].Selections = sels
	}
	return tickets, nil
}

func (db *DB) GetTicketByExternalIDWithContext(ctx context.Context, externalID string) (*models.Ticket, error) {
	return db.GetTicketByExternalID(ctx, externalID)
}

func (db *DB) GetUserByUsernameWithContext(ctx context.Context, username string) (*models.User, error) {
	return db.GetUserByUsername(username)
}

func (db *DB) CreateUserWithContext(ctx context.Context, username string, initialBalance float64) (*models.User, error) {
	return db.CreateUser(username, initialBalance)
}

func (db *DB) GetUserByIDWithContext(ctx context.Context, userID int64) (*models.User, error) {
	return db.GetUserByID(ctx, userID)
}

func (db *DB) GetPendingTicketsWithContext(ctx context.Context) ([]models.Ticket, error) {
	return db.GetPendingTickets()
}

func (db *DB) GetTicketsByUserWithContext(ctx context.Context, userID int64) ([]models.Ticket, error) {
	return db.GetTicketsByUser(userID)
}

func (db *DB) GetTicketByIDWithContext(ctx context.Context, ticketID int64) (*models.Ticket, error) {
	return db.GetTicketByID(ctx, ticketID)
}

func (db *DB) GetAllTicketsWithContext(ctx context.Context) ([]models.Ticket, error) {
	return db.GetAllTickets(ctx)
}

func (db *DB) GetPendingTicketsByEventIDWithContext(ctx context.Context, eventID int64) ([]models.Ticket, error) {
	return db.GetPendingTicketsByEventID(ctx, eventID)
}

func (db *DB) UpdateUserBalanceDirectWithContext(ctx context.Context, userID int64, amount float64) error {
	return db.UpdateUserBalanceDirect(ctx, userID, amount)
}

func (db *DB) UpdateTicketStatusWithContext(ctx context.Context, ticketID int64, status models.TicketStatus) error {
	return db.UpdateTicketStatus(ctx, ticketID, status)
}

func (db *DB) UpdateSelectionStatusWithContext(ctx context.Context, selID int64, status models.TicketStatus) error {
	return db.UpdateSelectionStatus(ctx, selID, status)
}

func (db *DB) UpdateSelectionStatusBatchWithContext(ctx context.Context, selections []models.TicketSelection) error {
	return db.UpdateSelectionStatusBatch(ctx, selections)
}

func (db *DB) UpdateTicketOddsAndWin(ctx context.Context, ticketID int64, totalOdds, possibleWin float64) error {
	q := `UPDATE tickets SET total_odds = $1, possible_win = $2 WHERE id = $3`
	_, err := db.postgres.pool.Exec(ctx, q, totalOdds, possibleWin, ticketID)
	return err
}

func (db *DB) UpdateTicketStatusBatchWithContext(ctx context.Context, tickets []models.Ticket) error {
	return db.UpdateTicketStatusBatch(ctx, tickets)
}

func (db *DB) GetSelectionByIDWithContext(ctx context.Context, selID int64) (*models.TicketSelection, error) {
	return db.GetSelectionByID(ctx, selID)
}

func (db *DB) GetSelectionsByEventIDWithContext(ctx context.Context, eventID int64) ([]models.TicketSelection, error) {
	return db.GetSelectionsByEventID(ctx, eventID)
}

func (db *DB) GetSelectionsByTicketIDWithContext(ctx context.Context, ticketID int64) ([]models.TicketSelection, error) {
	return db.GetSelectionsByTicketID(ctx, ticketID)
}

func (db *DB) GetTicketWithSelectionsWithContext(ctx context.Context, ticketID int64) (*models.Ticket, error) {
	return db.GetTicketWithSelections(ctx, ticketID)
}

func (db *DB) UpdateUserBalanceWithContext(ctx context.Context, userID int64, amount float64) error {
	return db.UpdateUserBalance(ctx, userID, amount)
}
