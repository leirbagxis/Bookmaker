package db

import (
	"database/sql"
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
	q := `
	CREATE TABLE IF NOT EXISTS matches (
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
	);
	`
	_, err := db.conn.Exec(q)
	return err
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

func (db *DB) Close() error {
	return db.conn.Close()
}
