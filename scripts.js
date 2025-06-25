let peer, myPeerId, conn, playerSymbol;
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

// Host: Generate Peer ID on button click
document.getElementById("generatePeerIdBtn").onclick = function () {
  myPeerId = generateShortId();
  peer = new Peer(myPeerId);

  // Replace button with Peer ID and copy icon
  document.getElementById("peerIdSection").innerHTML = `
    Your Peer ID: <span id="peerId">${myPeerId}</span>
    <i id="copyPeerId" class="bi bi-copy" style="cursor:pointer;" title="Copy Peer ID"></i>
  `;

  // Set the copy handler after DOM update
  document.getElementById("copyPeerId").onclick = function () {
    navigator.clipboard.writeText(myPeerId);
    this.title = "Copied!";
    setTimeout(() => {
      this.title = "Copy Peer ID";
    }, 1000);
  };

  peer.on("open", (id) => {
    document.getElementById("peerId").textContent = id;
  });

  peer.on("connection", (connection) => {
    conn = connection;
    conn.on("data", handleMove);
    status.textContent = "Opponent connected! Your turn.";
    playerSymbol = "X";
  });
};

// Function to host a game
function startGame() {
  playerSymbol = "X";
  status.textContent = "Waiting for opponent to connect...";
  document.getElementById("peerInput").disabled = true;

  peer.on("connection", (connection) => {
    conn = connection;
    conn.on("data", handleMove);
    status.textContent = "Opponent connected! Your turn.";
  });
}

// Function to join a game
function joinGame() {
  const peerId = document.getElementById("peerInput").value;
  conn = peer.connect(peerId);

  conn.on("open", () => {
    playerSymbol = "O";
    conn.on("data", handleMove);
    status.textContent = "Connected! Waiting for opponent's move...";
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

  const result = checkWinner();
  if (result) endGame(result);
}

// Function to make a move
function makeMove(index) {
  const cell = document.querySelector(`.cell[data-index="${index}"]`);
  if (cell.innerHTML !== "" || currentTurn !== playerSymbol) return;

  if (playerSymbol === "X") {
    cell.innerHTML = '<i class="bi bi-x"></i>';
    cell.classList.add("x");
  } else {
    cell.innerHTML = '<i class="bi bi-circle"></i>';
    cell.classList.add("o");
  }
  cell.classList.add("taken");

  if (conn) {
    conn.send({ index, symbol: playerSymbol });
  }

  currentTurn = playerSymbol === "X" ? "O" : "X";
  status.textContent = "Opponent's turn...";

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

// Set cell onclicks and manage join button state on page load
window.onload = () => {
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.onclick = function () {
      makeMove(Number(cell.dataset.index));
    };
  });

  const peerInput = document.getElementById("peerInput");
  const joinBtn = document.querySelector('button[onclick="joinGame()"]');

  function updateJoinBtnState() {
    const isValid = peerInput.value.length === 8;
    joinBtn.disabled = !isValid;
    if (!isValid) {
      joinBtn.classList.add("disabled");
    } else {
      joinBtn.classList.remove("disabled");
    }
  }

  peerInput.addEventListener("input", updateJoinBtnState);
  peerInput.addEventListener("paste", () => {
    setTimeout(updateJoinBtnState, 0);
  });

  updateJoinBtnState();
};
