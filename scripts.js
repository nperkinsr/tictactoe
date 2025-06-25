// Generate a short ID for the PeerJS connection
function generateShortId(length = 8) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

const myPeerId = generateShortId();
const peer = new Peer(myPeerId); // Use your custom 8-char ID

peer.on("open", (id) => {
  console.log("Peer open with ID:", id);
  document.getElementById("peerId").textContent = id; // Show the custom ID
  document.getElementById("copyPeerId").style.display = "inline";
  document.getElementById("copyPeerId").onclick = function () {
    navigator.clipboard.writeText(id);
    this.title = "Copied!";
    setTimeout(() => {
      this.title = "Copy Peer ID";
    }, 1000);
  };
});

let conn, playerSymbol; //Conn holds PeerJS connection and playerSymbol stores whether the player is "X" or "O" in the game
const status = document.getElementById("status");
let currentTurn = "X";

const winPatterns = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diags
];

// Generate and display the player's Peer ID

document.getElementById("copyPeerId").onclick = function () {
  const id = document.getElementById("peerId").textContent;
  navigator.clipboard.writeText(id);
  this.title = "Copied!";
  setTimeout(() => {
    this.title = "Copy Peer ID";
  }, 1000);
};

const roleHeader = document.querySelector("h3");

// Function to host a game
function startGame() {
  playerSymbol = "X";
  status.textContent = "Waiting for opponent to connect...";
  if (roleHeader) roleHeader.textContent = "You are now the host";
}

// Function to join a game
function joinGame() {
  const peerId = document.getElementById("peerInput").value;
  console.log("Joiner: joinGame called with peerId:", peerId);

  if (roleHeader) roleHeader.textContent = "You are now the joiner";

  if (peer.open) {
    connectToHost(peerId);
  } else {
    peer.once("open", () => {
      connectToHost(peerId);
    });
  }
}

function connectToHost(peerId) {
  console.log("Joiner: Attempting to connect to host with ID:", peerId);
  conn = peer.connect(peerId);

  conn.on("open", () => {
    console.log("Joiner: Connection open!");
    playerSymbol = "O";
    conn.on("data", handleMove);
    status.textContent = "You have joined! It is the host's turn.";
  });

  conn.on("error", (err) => {
    console.error("Joiner: Connection error:", err);
    status.textContent = "Connection error: " + err.message;
  });
}

// Handle incoming move from opponent
function handleMove(data) {
  if (data.restart) {
    restartGame();
    return;
  }
  const cell = document.querySelectorAll(".cell")[data.index];
  if (data.symbol === "X") {
    cell.innerHTML = '<i class="bi bi-x"></i>';
    cell.classList.add("x");
  } else {
    cell.innerHTML = '<i class="bi bi-circle"></i>';
    cell.classList.add("o");
  }
  cell.classList.add("taken");
  currentTurn = data.symbol === "X" ? "O" : "X";
  status.textContent =
    currentTurn === playerSymbol ? "Your turn!" : "Opponent's turn...";

  // Check for win/draw after opponent's move
  const result = checkWinner();
  if (result) endGame(result);
}

// Function to make a move
function makeMove(index) {
  const cell = document.querySelector(`.cell[data-index="${index}"]`);
  if (cell.innerHTML !== "") return; // Already taken

  // Ensure it's the player's turn
  if (currentTurn !== playerSymbol) {
    return;
  }

  // Mark the cell with the player's symbol and style
  if (playerSymbol === "X") {
    cell.innerHTML = '<i class="bi bi-x"></i>';
    cell.classList.add("x");
  } else {
    cell.innerHTML = '<i class="bi bi-circle"></i>';
    cell.classList.add("o");
  }
  cell.classList.add("taken");

  // Send move data to opponent
  if (conn) {
    conn.send({ index, symbol: playerSymbol });
  }

  // Update turn and status
  currentTurn = playerSymbol === "X" ? "O" : "X";
  status.textContent = "Opponent's turn...";

  // Check for win/draw after your move
  const result = checkWinner();
  if (result) endGame(result);
}

function getBoardState() {
  return Array.from(document.querySelectorAll(".cell")).map((cell) => {
    if (cell.classList.contains("x")) return "X";
    if (cell.classList.contains("o")) return "O";
    return "";
  });
}

function checkWinner() {
  const board = getBoardState();
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.every((cell) => cell) ? "draw" : null;
}

function endGame(result) {
  let message = "";
  if (result === "draw") {
    message = "It's a draw!";
  } else {
    message = result === playerSymbol ? "You win!" : "You lose!";
  }
  status.innerHTML = `${message} <button id="playAgainBtn">Play again?</button>`;
  document.querySelectorAll(".cell").forEach((cell) => (cell.onclick = null));

  document.getElementById("playAgainBtn").onclick = () => {
    if (conn) conn.send({ restart: true });
    restartGame();
  };
}

function restartGame() {
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.innerHTML = "";
    cell.classList.remove("x", "o", "taken");
    cell.onclick = function () {
      makeMove(Number(cell.dataset.index));
    };
  });
  currentTurn = "X";
  status.textContent =
    playerSymbol === "X"
      ? conn
        ? "Opponent connected! Your turn."
        : "Waiting for opponent to connect..."
      : "Connected! Waiting for opponent's move...";
}

// Set cell onclicks on page load
window.onload = () => {
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.onclick = function () {
      makeMove(Number(cell.dataset.index));
    };
  });
};

peer.on("error", (err) => {
  console.error("PeerJS error:", err);
  status.textContent = "PeerJS error: " + err;
});

// Listen for connections as soon as the page loads
peer.on("connection", (connection) => {
  console.log("Host: Received connection from", connection.peer);
  conn = connection;
  conn.on("data", handleMove);
  status.textContent = "Opponent connected! Your turn.";
  playerSymbol = "X";
});
