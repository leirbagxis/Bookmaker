package db

import (
	"context"
	"fmt"
)

func (db *PostgresDB) migrate(ctx context.Context) error {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
			created_at TIMESTAMPTZ DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS tickets (
			id BIGSERIAL PRIMARY KEY,
			external_id TEXT UNIQUE NOT NULL,
			user_id BIGINT NOT NULL REFERENCES users(id),
			amount DECIMAL(12,2) NOT NULL,
			total_odds DECIMAL(10,4) NOT NULL,
			possible_win DECIMAL(12,2) NOT NULL,
			status TEXT NOT NULL DEFAULT 'PENDING',
			idempotency_key TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE (user_id, idempotency_key)
		);`,
		`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS idempotency_key TEXT;`,
		`DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_idempotency') THEN
				ALTER TABLE tickets ADD CONSTRAINT unique_user_idempotency UNIQUE (user_id, idempotency_key);
			END IF;
		END
		$$;`,
		`CREATE TABLE IF NOT EXISTS ticket_selections (
			id BIGSERIAL PRIMARY KEY,
			ticket_id BIGINT NOT NULL REFERENCES tickets(id),
			event_id BIGINT NOT NULL,
			home_team TEXT NOT NULL,
			away_team TEXT NOT NULL,
			start_time TIMESTAMPTZ NOT NULL,
			market_id TEXT NOT NULL,
			market_name TEXT NOT NULL,
			selection_id TEXT NOT NULL,
			selection_name TEXT NOT NULL,
			odds DECIMAL(10,4) NOT NULL,
			status TEXT NOT NULL DEFAULT 'PENDING'
		);`,
		`CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);`,
		`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`,
		`CREATE INDEX IF NOT EXISTS idx_ticket_selections_ticket_id ON ticket_selections(ticket_id);`,
	}

	for _, migration := range migrations {
		if _, err := db.pool.Exec(ctx, migration); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	return nil
}
