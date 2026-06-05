package cache

import (
	"sync"
	"time"
)

type item[V any] struct {
	value     V
	expiresAt time.Time
}

type Cache[K comparable, V any] struct {
	mu    sync.RWMutex
	items map[K]item[V]
	ttl   time.Duration
}

func New[K comparable, V any](ttl time.Duration) *Cache[K, V] {
	c := &Cache[K, V]{
		items: make(map[K]item[V]),
		ttl:   ttl,
	}
	go c.janitor()
	return c
}

func (c *Cache[K, V]) Get(key K) (V, bool) {
	c.mu.RLock()
	it, ok := c.items[key]
	c.mu.RUnlock()
	if !ok {
		var zero V
		return zero, false
	}
	if time.Now().After(it.expiresAt) {
		c.Delete(key)
		var zero V
		return zero, false
	}
	return it.value, true
}

func (c *Cache[K, V]) Set(key K, value V) {
	c.mu.Lock()
	c.items[key] = item[V]{
		value:     value,
		expiresAt: time.Now().Add(c.ttl),
	}
	c.mu.Unlock()
}

func (c *Cache[K, V]) Delete(key K) {
	c.mu.Lock()
	delete(c.items, key)
	c.mu.Unlock()
}

func (c *Cache[K, V]) janitor() {
	interval := c.ttl
	if interval < time.Second {
		interval = time.Second
	}
	t := time.NewTicker(interval)
	defer t.Stop()
	for range t.C {
		now := time.Now()
		c.mu.Lock()
		for k, it := range c.items {
			if now.After(it.expiresAt) {
				delete(c.items, k)
			}
		}
		c.mu.Unlock()
	}
}
