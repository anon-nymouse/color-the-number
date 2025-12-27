let grid = [], color_palette = [], active_color;
let score = 0, gameWon = false, gameOver = false, gameModeText = "", timeLeft = 60;
let gameW, gameH, offsetX, unit, tile_dim, margin = 20;
var color_i, color_j;

class Tile {
    constructor(x, y, dim, num) {
        this.x = x; this.y = y; this.dim = dim; this.num = num;
        this.isColored = false; this.color = 255;
    }
    draw() {
        stroke(220); fill(this.isColored ? this.color : 255);
        rect(this.x, this.y, this.dim, this.dim, 5);
        noStroke(); fill(0); textAlign(CENTER, CENTER);
        textSize(this.dim * 0.4); text(this.num, this.x + this.dim/2, this.y + this.dim/2);
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight).parent("gameContainer");
    calculateLayout();
}

function calculateLayout() {
    gameW = min(windowWidth, 600); gameH = windowHeight;
    offsetX = (windowWidth - gameW) / 2; unit = gameW / 100;
    color_palette = [
        { c: color(255, 80, 80), x: offsetX + gameW * 0.25, name: "Red" },
        { c: color(80, 255, 80), x: offsetX + gameW * 0.5, name: "Green" },
        { c: color(80, 80, 255), x: offsetX + gameW * 0.75, name: "Blue" }
    ];
}

function isPrime(n) {
    if (n < 2) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
    return true;
}

function init_game(cols, rows) {
    grid = []; score = 0; gameWon = false; gameOver = false;
    let mode = document.getElementById("challengeType").value;
    timeLeft = parseInt(document.getElementById("setTime").value);

    calculateLayout();
    tile_dim = (gameW - (margin * 2) - (cols * unit)) / cols;

    let n = 1;
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            grid.push(new Tile(offsetX + margin + i * (tile_dim + unit), gameH * 0.22 + j * (tile_dim + unit), tile_dim, n++));
        }
    }

    // Ensure i and j are unique
    if (!isMulti) {
        num_i = floor(random(2, 7));
        num_j = floor(random(2, 7));
        while(num_i === num_j) num_j = floor(random(2, 7));
    }

    // Assign unique colors
    let shuffled = [...color_palette].sort(() => random() - 0.5);
    color_i = shuffled[0]; color_j = shuffled[1];
    active_color = color_i.c;

    if (mode === "multiples") gameModeText = `Mult: ${num_i}(${color_i.name}), ${num_j}(${color_j.name})`;
    else if (mode === "primes") gameModeText = `Find Primes (${color_i.name})`;
    else gameModeText = `Primes (${color_i.name}), Mult ${num_i}(${color_j.name})`;
}

function draw() {
    background(250);
    if (!gameOver && !gameWon && frameCount % 60 === 0 && timeLeft > 0) {
        timeLeft--; if (timeLeft <= 0) gameOver = true;
    }
    fill(50); textAlign(CENTER); textSize(unit * 4);
    text(gameModeText, width/2, gameH * 0.1);
    text(`Score: ${score} | ${timeLeft}s`, width/2, gameH * 0.18);

    grid.forEach(t => t.draw());
    color_palette.forEach(p => {
        if (active_color === p.c) { fill(0, 20); ellipse(p.x, gameH * 0.9, unit * 14); }
        fill(p.c); ellipse(p.x, gameH * 0.9, unit * 10);
    });
    if (gameOver || gameWon) drawEndScreen();
}

function mousePressed() {
    if (gameOver || gameWon) return;
    color_palette.forEach(p => { if (dist(mouseX, mouseY, p.x, gameH * 0.9) < unit * 6) active_color = p.c; });

    grid.forEach(t => {
        if (mouseX > t.x && mouseX < t.x + t.dim && mouseY > t.y && mouseY < t.y + t.dim && !t.isColored) {
            let mode = document.getElementById("challengeType").value;
            let correct = false;
            if (mode === "multiples") {
                if (t.num % num_i === 0 && active_color === color_i.c) correct = true;
                else if (t.num % num_j === 0 && active_color === color_j.c) correct = true;
            } else if (mode === "primes") {
                if (isPrime(t.num) && active_color === color_i.c) correct = true;
            } else {
                if (isPrime(t.num) && active_color === color_i.c) correct = true;
                else if (t.num % num_i === 0 && active_color === color_j.c) correct = true;
            }

            if (correct) { t.isColored = true; t.color = active_color; score += 20; checkWin(); }
            else score = max(0, score - 5);
            sendScoreToServer();
        }
    });
}

function checkWin() {
    let mode = document.getElementById("challengeType").value;
    let targets = grid.filter(t => {
        if (mode === "multiples") return t.num % num_i === 0 || t.num % num_j === 0;
        if (mode === "primes") return isPrime(t.num);
        return isPrime(t.num) || t.num % num_i === 0;
    });
    if (targets.every(t => t.isColored)) { gameWon = true; score += timeLeft * 5; sendScoreToServer(); }
}

function drawEndScreen() {
    fill(255, 230); rect(0,0,width,height); fill(0);
    textAlign(CENTER, CENTER);

    if (isMulti) {
        let players = Object.values(opponents).sort((a,b) => b.score - a.score);
        textSize(unit * 5);
        text("Leaderboard", width/2, height/2 - 80);

        textSize(unit * 4);
        players.forEach((p, i) => {
            // Use p.name instead of p.id
            text(`${p.name}: ${p.score}`, width/2, height/2 + i*40);
        });
    } else {
        textSize(40);
        text("Final Score: " + score, width/2, height/2);
    }
}
