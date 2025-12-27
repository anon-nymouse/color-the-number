let socket, isMulti = false, roomID = null;
let playerID = "P" + Date.now() + Math.floor(Math.random() * 1000);
let opponents = {};
var num_i, num_j;

function showMultiplayerUI() {
    document.getElementById("ui-main").style.display = "none";
    document.getElementById("ui-multi").style.display = "block";
}

function showSettings(multi) {
    isMulti = multi;
    document.getElementById("ui-main").style.display = "none";
    document.getElementById("ui-multi").style.display = "none";
    document.getElementById("ui-settings").style.display = "block";
}

function connect(callback) {
    if (socket && socket.readyState === WebSocket.OPEN) return callback();

    // Dynamically detect server address (works on localhost or deployed)
    const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    const host = window.location.host;
    socket = new WebSocket(protocol + host + "/ws");

    socket.onopen = () => {
        console.log("Connected to server");
        callback();
    };

    socket.onmessage = (e) => {
        let d = JSON.parse(e.data);

        if (d.action === "roomCreated") {
            roomID = d.roomID;
            document.getElementById("ui-settings").style.display = "none";
            document.getElementById("ui-lobby").style.display = "block";
            document.getElementById("displayID").innerText = d.roomID;
            // Join as creator
            socket.send(JSON.stringify({
                action: "join",
                roomID: d.roomID,
                playerID: playerID,
                playerName: document.getElementById("playerNameInput").value || "Host"
            }));
        }

        if (d.action === "joined") {
            num_i = d.num_i; num_j = d.num_j; roomID = d.roomID; isMulti = true;
            document.getElementById("setCols").value = d.cols;
            document.getElementById("setRows").value = d.rows;
            document.getElementById("setTime").value = d.time;
            document.getElementById("challengeType").value = d.mode;

            document.getElementById("ui-multi").style.display = "none";
            document.getElementById("ui-lobby").style.display = "block";
            document.getElementById("displayID").innerText = d.roomID;
        }

        if (d.action === "startGame") {
            document.getElementById("menu").style.display = "none";
            init_game(parseInt(document.getElementById("setCols").value), parseInt(document.getElementById("setRows").value));
        }

        if (d.action === "scoreBoard") opponents = d.players;

        if (d.action === "error") {
            alert(d.message);
            window.location.reload();
        }
    };
}

function applySettings() {
    let name = document.getElementById("playerNameInput").value.trim() || "Player";
    let config = {
        cols: parseInt(document.getElementById("setCols").value),
        rows: parseInt(document.getElementById("setRows").value),
        time: parseInt(document.getElementById("setTime").value),
        mode: document.getElementById("challengeType").value,
        playerName: name
    };

    if (isMulti) {
        connect(() => socket.send(JSON.stringify({ action: "create", ...config })));
    } else {
        document.getElementById("menu").style.display = "none";
        init_game(config.cols, config.rows);
    }
}

function joinRoom() {
    let id = document.getElementById("roomInput").value.trim();
    let name = document.getElementById("playerNameInput").value.trim() || "Guest";
    if (id) {
        connect(() => socket.send(JSON.stringify({
            action: "join", roomID: id, playerID: playerID, playerName: name
        })));
    }
}

function sendScoreToServer() {
    if (isMulti && socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: "updateScore", roomID: roomID, playerID: playerID, score: score }));
    }
}
