package websocket

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow cross-origin for dev & dashboard
	},
}

type Client struct {
	hub            *Hub
	conn           *websocket.Conn
	send           chan []byte
	chainFilter    int64
	contractFilter string
	eventFilter    string
}

type Hub struct {
	mu         sync.RWMutex
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	redisCli   *redis.Client
}

func NewHub(redisCli *redis.Client) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte, 1024),
		redisCli:   redisCli,
	}
}

func (h *Hub) Run() {
	if h.redisCli != nil {
		go h.listenRedis()
	}

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			slog.Debug("WebSocket client connected", "clients_total", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			slog.Debug("WebSocket client disconnected", "clients_total", len(h.clients))

		case message := <-h.broadcast:
			h.dispatch(message)
		}
	}
}

func (h *Hub) Broadcast(msg []byte) {
	select {
	case h.broadcast <- msg:
	default:
		slog.Warn("WebSocket broadcast channel full; dropping message")
	}
}

func (h *Hub) dispatch(message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var payload struct {
		ChainID         int64  `json:"chain_id"`
		ContractAddress string `json:"contract_address"`
		EventSignature  string `json:"event_signature"`
	}
	_ = json.Unmarshal(message, &payload)

	for client := range h.clients {
		if client.chainFilter > 0 && client.chainFilter != payload.ChainID {
			continue
		}
		if client.contractFilter != "" && !strings.EqualFold(client.contractFilter, payload.ContractAddress) {
			continue
		}
		if client.eventFilter != "" && !strings.EqualFold(client.eventFilter, payload.EventSignature) {
			continue
		}

		select {
		case client.send <- message:
		default:
			// Bounded subscriber queue full: slow consumer disconnect
			slog.Warn("Disconnecting slow WebSocket consumer", "remote_addr", client.conn.RemoteAddr().String())
			close(client.send)
			delete(h.clients, client)
		}
	}
}

func (h *Hub) listenRedis() {
	ctx := context.Background()
	pubsub := h.redisCli.PSubscribe(ctx, "chainstream:*")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		h.Broadcast([]byte(msg.Payload))
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)
			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("WebSocket upgrade error", "error", err)
		return
	}

	chainFilter, _ := strconv.ParseInt(r.URL.Query().Get("chain"), 10, 64)
	contractFilter := r.URL.Query().Get("contract")
	eventFilter := r.URL.Query().Get("event")

	client := &Client{
		hub:            hub,
		conn:           conn,
		send:           make(chan []byte, 128), // bounded client buffer
		chainFilter:    chainFilter,
		contractFilter: contractFilter,
		eventFilter:    eventFilter,
	}

	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}
