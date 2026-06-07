package db

import (
	"database/sql"
	"time"
	"superbet/backend/internal/models"

	_ "modernc.org/sqlite"
)

type DB struct {
	conn *sql.DB
}

func New(dsn string) (*DB, error) {
	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db := &DB{conn: conn}
	if err := db.migrate(); err != nil {
		return nil, err
	}
	return db, nil
}

func (db *DB) migrate() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS matches (
			event_id INTEGER PRIMARY KEY,
			home_team TEXT NOT NULL,
			away_team TEXT NOT NULL,
			competition TEXT NOT NULL,
			start_time TEXT NOT NULL,
			status TEXT,
			home_odd REAL,
			draw_odd REAL,
			away_odd REAL,
			country TEXT,
			category TEXT,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			balance REAL NOT NULL DEFAULT 0 CHECK (balance >= 0),
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS tickets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			external_id TEXT UNIQUE NOT NULL,
			user_id INTEGER NOT NULL,
			amount REAL NOT NULL,
			total_odds REAL NOT NULL,
			possible_win REAL NOT NULL,
			status TEXT NOT NULL DEFAULT 'PENDING',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);`,
		`CREATE TABLE IF NOT EXISTS ticket_selections (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			ticket_id INTEGER NOT NULL,
			event_id INTEGER NOT NULL,
			home_team TEXT NOT NULL,
			away_team TEXT NOT NULL,
			market_id TEXT NOT NULL,
			market_name TEXT NOT NULL,
			selection_id TEXT NOT NULL,
			selection_name TEXT NOT NULL,
			odds REAL NOT NULL,
			status TEXT NOT NULL DEFAULT 'PENDING',
			FOREIGN KEY (ticket_id) REFERENCES tickets(id)
		);`,
	}

	for _, s := range statements {
		if _, err := db.conn.Exec(s); err != nil {
			return err
		}
	}
	return nil
}

func (db *DB) SaveMatches(matches []models.Match) error {
	tx, err := db.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	q := `
	INSERT INTO matches (event_id, home_team, away_team, competition, start_time, status, home_odd, draw_odd, away_odd, country, category, updated_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	ON CONFLICT(event_id) DO UPDATE SET
		home_team=excluded.home_team,
		away_team=excluded.away_team,
		competition=excluded.competition,
		start_time=excluded.start_time,
		status=excluded.status,
		home_odd=excluded.home_odd,
		draw_odd=excluded.draw_odd,
		away_odd=excluded.away_odd,
		country=excluded.country,
		category=excluded.category,
		updated_at=CURRENT_TIMESTAMP;
	`
	stmt, err := tx.Prepare(q)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, m := range matches {
		_, err = stmt.Exec(
			m.EventID, m.HomeTeam, m.AwayTeam, m.Competition,
			m.StartTime, m.Status, m.HomeOdd, m.DrawOdd, m.AwayOdd,
			m.Country, m.Category,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (db *DB) GetMatches() ([]models.Match, error) {
	q := `
	SELECT event_id, home_team, away_team, competition, start_time, status, home_odd, draw_odd, away_odd, country, category
	FROM matches
	`
	rows, err := db.conn.Query(q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	matches := make([]models.Match, 0)
	for rows.Next() {
		var m models.Match
		err := rows.Scan(
			&m.EventID, &m.HomeTeam, &m.AwayTeam, &m.Competition,
			&m.StartTime, &m.Status, &m.HomeOdd, &m.DrawOdd, &m.AwayOdd,
			&m.Country, &m.Category,
		)
		if err != nil {
			return nil, err
		}
		matches = append(matches, m)
	}
	return matches, nil
}

// DeleteFinished remove do banco todos os jogos com status finalizado.
// Retorna o número de linhas removidas.
func (db *DB) DeleteFinished() (int64, error) {
	q := `
	DELETE FROM matches
	WHERE status IN ('FT', 'FINISHED', 'CANCELLED', 'POSTPONED')
	`
	res, err := db.conn.Exec(q)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// DeleteNotIn remove do banco todos os jogos cujo event_id NÃO está
// na lista fornecida. Útil para limpar registros órfãos (ex: virada do dia).
// Retorna o número de linhas removidas.
func (db *DB) DeleteNotIn(eventIDs []int64) (int64, error) {
	if len(eventIDs) == 0 {
		return 0, nil
	}
	placeholders := make([]byte, 0, len(eventIDs)*2)
	args := make([]interface{}, len(eventIDs))
	for i, id := range eventIDs {
		if i > 0 {
			placeholders = append(placeholders, ',')
		}
		placeholders = append(placeholders, '?')
		args[i] = id
	}
	q := "DELETE FROM matches WHERE event_id NOT IN (" + string(placeholders) + ")"
	res, err := db.conn.Exec(q, args...)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (db *DB) Close() error {
	return db.conn.Close()
}

func (db *DB) GetUserByUsername(username string) (*models.User, error) {
	q := `SELECT id, username, balance, created_at FROM users WHERE username = ?`
	var u models.User
	var createdAt string
	err := db.conn.QueryRow(q, username).Scan(&u.ID, &u.Username, &u.Balance, &createdAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	u.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	if u.CreatedAt.IsZero() {
		u.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	}
	return &u, nil
}

func (db *DB) CreateUser(username string, initialBalance float64) (*models.User, error) {
	q := `INSERT INTO users (username, balance) VALUES (?, ?)`
	_, err := db.conn.Exec(q, username, initialBalance)
	if err != nil {
		return nil, err
	}
	return db.GetUserByUsername(username)
}

func (db *DB) UpdateUserBalance(tx *sql.Tx, userID int64, amount float64) error {
	q := `UPDATE users SET balance = balance + ? WHERE id = ?`
	var err error
	if tx != nil {
		_, err = tx.Exec(q, amount, userID)
	} else {
		_, err = db.conn.Exec(q, amount, userID)
	}
	return err
}

func (db *DB) SaveTicket(userID int64, amount, totalOdds, possibleWin float64, selections []models.TicketSelection) (string, error) {
	tx, err := db.conn.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	// 1. Descontar saldo
	if err := db.UpdateUserBalance(tx, userID, -amount); err != nil {
		return "", err
	}

	externalID := generateBookingCode()

	// 2. Salvar Ticket
	qTicket := `INSERT INTO tickets (external_id, user_id, amount, total_odds, possible_win) VALUES (?, ?, ?, ?, ?)`
	res, err := tx.Exec(qTicket, externalID, userID, amount, totalOdds, possibleWin)
	if err != nil {
		return "", err
	}
	ticketID, _ := res.LastInsertId()

	// 3. Salvar Seleções
	qSel := `INSERT INTO ticket_selections (ticket_id, event_id, home_team, away_team, market_id, market_name, selection_id, selection_name, odds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	stmt, err := tx.Prepare(qSel)
	if err != nil {
		return "", err
	}
	defer stmt.Close()

	for _, s := range selections {
		_, err = stmt.Exec(ticketID, s.EventID, s.HomeTeam, s.AwayTeam, s.MarketID, s.MarketName, s.SelectionID, s.SelectionName, s.Odds)
		if err != nil {
			return "", err
		}
	}

	return externalID, tx.Commit()
}

func (db *DB) GetPendingTickets() ([]models.Ticket, error) {
	q := `SELECT id, external_id, user_id, amount, total_odds, possible_win, status, created_at FROM tickets WHERE status = 'PENDING'`
	rows, err := db.conn.Query(q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []models.Ticket
	for rows.Next() {
		var t models.Ticket
		var createdAt string
		if err := rows.Scan(&t.ID, &t.ExternalID, &t.UserID, &t.Amount, &t.TotalOdds, &t.PossibleWin, &t.Status, &createdAt); err != nil {
			return nil, err
		}
		// Tenta parsear em UTC (padrão SQLite)
		t.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		if t.CreatedAt.IsZero() {
			t.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		}

		// Buscar seleções
		sels, err := db.getTicketSelections(t.ID)
		if err != nil {
			return nil, err
		}
		t.Selections = sels
		tickets = append(tickets, t)
	}
	return tickets, nil
}

func (db *DB) getTicketSelections(ticketID int64) ([]models.TicketSelection, error) {
	q := `SELECT id, ticket_id, event_id, home_team, away_team, market_id, market_name, selection_id, selection_name, odds, status FROM ticket_selections WHERE ticket_id = ?`
	rows, err := db.conn.Query(q, ticketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sels []models.TicketSelection
	for rows.Next() {
		var s models.TicketSelection
		if err := rows.Scan(&s.ID, &s.TicketID, &s.EventID, &s.HomeTeam, &s.AwayTeam, &s.MarketID, &s.MarketName, &s.SelectionID, &s.SelectionName, &s.Odds, &s.Status); err != nil {
			return nil, err
		}
		sels = append(sels, s)
	}
	return sels, nil
}

func (db *DB) UpdateTicketStatus(ticketID int64, status models.TicketStatus) error {
	q := `UPDATE tickets SET status = ? WHERE id = ?`
	_, err := db.conn.Exec(q, string(status), ticketID)
	return err
}

func (db *DB) UpdateSelectionStatus(selID int64, status models.TicketStatus) error {
	q := `UPDATE ticket_selections SET status = ? WHERE id = ?`
	_, err := db.conn.Exec(q, string(status), selID)
	return err
}

func (db *DB) GetTicketsByUser(userID int64) ([]models.Ticket, error) {
	q := `SELECT id, external_id, user_id, amount, total_odds, possible_win, status, created_at FROM tickets WHERE user_id = ? ORDER BY created_at DESC`
	rows, err := db.conn.Query(q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []models.Ticket
	for rows.Next() {
		var t models.Ticket
		var createdAt string
		if err := rows.Scan(&t.ID, &t.ExternalID, &t.UserID, &t.Amount, &t.TotalOdds, &t.PossibleWin, &t.Status, &createdAt); err != nil {
			return nil, err
		}
		// Tenta parsear em UTC (padrão SQLite)
		t.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		if t.CreatedAt.IsZero() {
			t.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		}

		// Buscar seleções
		sels, err := db.getTicketSelections(t.ID)
		if err != nil {
			return nil, err
		}
		t.Selections = sels
		tickets = append(tickets, t)
	}
	return tickets, nil
}

func generateBookingCode() string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	seed := time.Now().UnixNano()
	res := make([]byte, 8)
	for i := range res {
		seed = seed * 1103515245 + 12345
		idx := (seed / 65536) % int64(len(chars))
		if idx < 0 { idx = -idx }
		res[i] = chars[idx]
	}
	return "SB-" + string(res[:4]) + "-" + string(res[4:])
}


