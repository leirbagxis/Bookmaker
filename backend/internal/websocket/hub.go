package websocket

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 30 * time.Second
	maxMessageSize = 1 << 16
)

type Hub struct {
	mu      sync.RWMutex
	clients map[*Client]bool
	// eventWatchers: eventID -> conjunto de clientes que estão visualizando
	eventWatchers map[int64]map[*Client]struct{}
}

func NewHub() *Hub {
	return &Hub{
		clients:       make(map[*Client]bool),
		eventWatchers: make(map[int64]map[*Client]struct{}),
	}
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	h.clients[c] = true
	h.mu.Unlock()
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
	}
	// Remove cliente de todos os eventWatchers
	for eventID, watchers := range h.eventWatchers {
		if _, watching := watchers[c]; watching {
			delete(watchers, c)
			if len(watchers) == 0 {
				delete(h.eventWatchers, eventID)
			}
		}
	}
	h.mu.Unlock()
}

// SubscribeEvent registra o cliente como observador do evento.
func (h *Hub) SubscribeEvent(c *Client, eventID int64) {
	h.mu.Lock()
	if _, ok := h.eventWatchers[eventID]; !ok {
		h.eventWatchers[eventID] = make(map[*Client]struct{})
	}
	h.eventWatchers[eventID][c] = struct{}{}
	h.mu.Unlock()
}

// UnsubscribeEvent remove o cliente como observador do evento.
// Retorna true se era o último observador do evento.
func (h *Hub) UnsubscribeEvent(c *Client, eventID int64) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	watchers, ok := h.eventWatchers[eventID]
	if !ok {
		return false
	}
	delete(watchers, c)
	if len(watchers) == 0 {
		delete(h.eventWatchers, eventID)
		return true
	}
	return false
}

// ActiveEventIDs retorna a lista de eventIDs que têm pelo menos 1 observador.
func (h *Hub) ActiveEventIDs() []int64 {
	h.mu.RLock()
	defer h.mu.RUnlock()
	ids := make([]int64, 0, len(h.eventWatchers))
	for id := range h.eventWatchers {
		ids = append(ids, id)
	}
	return ids
}

// Broadcast envia msg para todos os clientes conectados.
func (h *Hub) Broadcast(msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		select {
		case c.send <- msg:
		default:
			// buffer cheio, descarta
		}
	}
}

// BroadcastOdds envia msg apenas para clientes que assinaram o evento.
func (h *Hub) BroadcastOdds(eventID int64, msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	watchers, ok := h.eventWatchers[eventID]
	if !ok {
		return
	}
	for c := range watchers {
		select {
		case c.send <- msg:
		default:
			// buffer cheio, descarta
		}
	}
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

func newClient(hub *Hub, conn *websocket.Conn) *Client {
	return &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
	}
}

func (c *Client) readPump(srv *Server) {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		srv.Dispatch(c, msg)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
