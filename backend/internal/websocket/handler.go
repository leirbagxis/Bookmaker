package websocket

import (
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type Handler struct {
	hub *Hub
	srv *Server
}

func NewHandler(h *Hub, s *Server) *Handler {
	return &Handler{hub: h, srv: s}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	client := newClient(h.hub, conn)
	h.hub.Register(client)
	go client.writePump()
	go client.readPump(h.srv)
}
