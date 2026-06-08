package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"superbet/backend/internal/models"
)

const oddsPrefix = "odds:"

type OddsRedis struct {
	client *RedisClient
	ttl    time.Duration
}

func NewOddsRedis(client *RedisClient, ttl time.Duration) *OddsRedis {
	return &OddsRedis{
		client: client,
		ttl:    ttl,
	}
}

func (o *OddsRedis) SetOdds(ctx context.Context, match models.Match) error {
	key := fmt.Sprintf("%s%d", oddsPrefix, match.EventID)
	data, err := json.Marshal(match)
	if err != nil {
		return fmt.Errorf("failed to marshal odds: %w", err)
	}

	return o.client.client.Set(ctx, key, data, o.ttl).Err()
}

func (o *OddsRedis) SetManyOdds(ctx context.Context, matches []models.Match) error {
	var lastErr error
	saved := 0
	for _, match := range matches {
		key := fmt.Sprintf("%s%d", oddsPrefix, match.EventID)
		data, err := json.Marshal(match)
		if err != nil {
			lastErr = fmt.Errorf("failed to marshal odds: %w", err)
			continue
		}
		if err := o.client.client.Set(ctx, key, data, o.ttl).Err(); err != nil {
			lastErr = fmt.Errorf("failed to set key %s: %w", key, err)
			continue
		}
		saved++
	}
	log.Printf("SetManyOdds: %d/%d matches salvos no Redis", saved, len(matches))
	return lastErr
}

func (o *OddsRedis) GetOdds(ctx context.Context, eventID int64) (*models.Match, error) {
	key := fmt.Sprintf("%s%d", oddsPrefix, eventID)
	data, err := o.client.client.Get(ctx, key).Bytes()
	if err != nil {
		return nil, fmt.Errorf("failed to get odds: %w", err)
	}

	var match models.Match
	if err := json.Unmarshal(data, &match); err != nil {
		return nil, fmt.Errorf("failed to unmarshal odds: %w", err)
	}

	return &match, nil
}

func (o *OddsRedis) GetAllOdds(ctx context.Context) ([]models.Match, error) {
	keys, err := o.client.client.Keys(ctx, oddsPrefix+"*").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get odds keys: %w", err)
	}

	if len(keys) == 0 {
		return nil, nil
	}

	dataSlice, err := o.client.client.MGet(ctx, keys...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get odds values: %w", err)
	}

	matches := make([]models.Match, 0, len(dataSlice))
	for _, data := range dataSlice {
		if data == nil {
			continue
		}
		var raw []byte
		switch v := data.(type) {
		case []byte:
			raw = v
		case string:
			raw = []byte(v)
		default:
			continue
		}
		var match models.Match
		if err := json.Unmarshal(raw, &match); err != nil {
			continue
		}
		matches = append(matches, match)
	}

	return matches, nil
}

func (o *OddsRedis) DeleteOdds(ctx context.Context, eventID int64) error {
	key := fmt.Sprintf("%s%d", oddsPrefix, eventID)
	return o.client.client.Del(ctx, key).Err()
}

func (o *OddsRedis) DeleteManyOdds(ctx context.Context, eventIDs []int64) error {
	if len(eventIDs) == 0 {
		return nil
	}

	keys := make([]string, len(eventIDs))
	for i, id := range eventIDs {
		keys[i] = fmt.Sprintf("%s%d", oddsPrefix, id)
	}

	return o.client.client.Del(ctx, keys...).Err()
}

func (o *OddsRedis) SetOddsTTL(ctx context.Context, eventID int64, ttl time.Duration) error {
	key := fmt.Sprintf("%s%d", oddsPrefix, eventID)
	return o.client.client.Expire(ctx, key, ttl).Err()
}
