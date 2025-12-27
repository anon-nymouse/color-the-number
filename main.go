package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

type Player struct {
	ID    string          `json:"id"`
	Name  string          `json:"name"`
	Score int             `json:"score"`
	Conn  *websocket.Conn `json:"-"`
}

type Room struct {
	ID      string            `json:"id"`
	Players map[string]*Player `json:"players"`
	NumI    int               `json:"num_i"`
	NumJ    int               `json:"num_j"`
	Cols    int               `json:"cols"`
	Rows    int               `json:"rows"`
	Time    int               `json:"time"`
	Mode    string            `json:"mode"`
}

var (
	rooms   = make(map[string]*Room)
	roomsMu sync.Mutex
)

func main() {
	rand.Seed(time.Now().UnixNano()) // Seed for true randomness
	http.Handle("/", http.FileServer(http.Dir("./public")))
	http.HandleFunc("/ws", handleConnections)
	fmt.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer ws.Close()

	for {
		var msg map[string]interface{}
		if err := ws.ReadJSON(&msg); err != nil {
			break
		}

		action, ok := msg["action"].(string)
		if !ok {
			continue
		}

		roomsMu.Lock()
		switch action {
		case "create":
			roomID := fmt.Sprintf("%d", rand.Intn(9000)+1000)

			// Logic to ensure i and j are never the same
			i := rand.Intn(5) + 2 // 2 to 6
			j := rand.Intn(5) + 3 // 3 to 7
			for i == j {
				j = rand.Intn(5) + 3
			}

			cols := 10
			if val, ok := msg["cols"].(float64); ok { cols = int(val) }
			rows := 8
			if val, ok := msg["rows"].(float64); ok { rows = int(val) }
			timeLimit := 60
			if val, ok := msg["time"].(float64); ok { timeLimit = int(val) }
			mode := "multiples"
			if val, ok := msg["mode"].(string); ok { mode = val }

			rooms[roomID] = &Room{
				ID:      roomID,
				Players: make(map[string]*Player),
				NumI:    i,
				NumJ:    j,
				Cols:    cols,
				Rows:    rows,
				Time:    timeLimit,
				Mode:    mode,
			}
			ws.WriteJSON(map[string]interface{}{"action": "roomCreated", "roomID": roomID})

		case "join":
			id, _ := msg["roomID"].(string)
			pID, _ := msg["playerID"].(string)
			pName, ok := msg["playerName"].(string)
			if !ok || pName == "" {
				pName = "Guest"
			}

			if room, ok := rooms[id]; ok {
				room.Players[pID] = &Player{
					ID:    pID,
					Name:  pName,
					Conn:  ws,
					Score: 0,
				}

				ws.WriteJSON(map[string]interface{}{
					"action": "joined",
					"roomID": id,
					"num_i":  room.NumI,
					"num_j":  room.NumJ,
					"cols":   room.Cols,
					"rows":   room.Rows,
					"time":   room.Time,
					"mode":   room.Mode,
				})

				if len(room.Players) >= 2 {
					for _, p := range room.Players {
						p.Conn.WriteJSON(map[string]interface{}{"action": "startGame"})
					}
				}
			} else {
				ws.WriteJSON(map[string]interface{}{
					"action":  "error",
					"message": "Room " + id + " not found!",
				})
			}

		case "updateScore":
			roomID, _ := msg["roomID"].(string)
			pID, _ := msg["playerID"].(string)
			if room, ok := rooms[roomID]; ok {
				if player, exists := room.Players[pID]; exists {
					player.Score = int(msg["score"].(float64))
					for _, p := range room.Players {
						p.Conn.WriteJSON(map[string]interface{}{
							"action":  "scoreBoard",
							"players": room.Players,
						})
					}
				}
			}
		}
		roomsMu.Unlock()
	}
}
