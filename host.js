let ws;
let room = '';
let idx = -1;

const $ = id => document.getElementById(id);

function createRoom() {

  room = Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase();

  // Show room code
  const roomElement = $('room');

  if (roomElement) {
    roomElement.textContent = 'Room: ' + room;
  }

  // Create participant URL
  const joinUrl =
    location.origin + '/?room=' + room;

  const joinUrlElement = $('joinurl');

  if (joinUrlElement) {
    joinUrlElement.textContent = joinUrl;
  }

  // Create QR code
  const qrUrl =
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' +
    encodeURIComponent(joinUrl);

  const qrElement = $('qr');

  if (qrElement) {
    qrElement.src = qrUrl;
    qrElement.style.display = 'block';
  }

  // Connect host
  connectHost();
}


function connectHost() {

  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {
    return;
  }

  const protocol =
    location.protocol === 'https:'
      ? 'wss:'
      : 'ws:';

  ws = new WebSocket(
    protocol +
    '//' +
    location.host +
    '/ws?room=' +
    encodeURIComponent(room) +
    '&id=HOST'
  );

  ws.onopen = () => {

    const status = $('status');

    if (status) {
      status.textContent =
        'Host connected';
    }

    enableButton('start');
    enableButton('next');
    enableButton('prev');
    enableButton('pause');
    enableButton('board');
  };

  ws.onclose = () => {

    const status = $('status');

    if (status) {
      status.textContent =
        'Host disconnected';
    }
  };

  ws.onerror = error => {

    console.error(
      'WebSocket error:',
      error
    );
  };

  ws.onmessage = event => {

    let message;

    try {
      message =
        JSON.parse(event.data);
    } catch (error) {
      return;
    }

    handleMessage(message);
  };
}


function enableButton(id) {

  const button = $(id);

  if (button) {
    button.disabled = false;
  }
}


function handleMessage(message) {

  // Participants
  if (message.type === 'state') {

    const count = $('count');

    if (count) {
      count.textContent =
        message.players;
    }

    const players = $('players');

    if (players) {

      players.innerHTML = '';

      message.names.forEach(name => {

        const li =
          document.createElement('li');

        li.textContent = name;

        players.appendChild(li);
      });
    }
  }


  // Question
  if (message.type === 'question') {

    idx = message.index;

    const question = $('question');

    if (question) {
      question.textContent =
        message.question;
    }

    const round = $('round');

    if (round) {
      round.textContent =
        'Round ' + message.round;
    }

    const timer = $('timer');

    if (timer) {
      timer.textContent =
        message.points + ' points';

      timer.classList.remove('locked');
    }

    const options = $('options');

    if (options) {

      options.innerHTML = '';

      message.options.forEach(
        (option, i) => {

          const div =
            document.createElement('div');

          div.className =
            'host-option';

          div.textContent =
            String.fromCharCode(65 + i) +
            '. ' +
            option;

          options.appendChild(div);
        }
      );
    }
  }


  // Timer
  if (message.type === 'tick') {

    const timer = $('timer');

    if (timer) {
      timer.textContent =
        message.seconds + ' sec';
    }
  }


  // Locked
  if (message.type === 'locked') {

    const timer = $('timer');

    if (timer) {
      timer.textContent =
        'LOCKED';

      timer.classList.add(
        'locked'
      );
    }
  }


  // Leaderboard
  if (message.type === 'leaderboard') {

    showLeaderboard(
      message.items
    );
  }
}


// =============================
// START / NEXT QUESTION
// =============================

function startQuestion() {

  if (
    !ws ||
    ws.readyState !== WebSocket.OPEN
  ) {
    return;
  }

  const nextIndex =
    idx + 1;

  if (
    nextIndex < 0 ||
    nextIndex >= 30
  ) {
    return;
  }

  idx = nextIndex;

  ws.send(JSON.stringify({
    type: 'start',
    index: idx
  }));
}


// =============================
// PREVIOUS QUESTION
// =============================

function previousQuestion() {

  if (
    !ws ||
    ws.readyState !== WebSocket.OPEN
  ) {
    return;
  }

  const previous =
    Math.max(0, idx - 1);

  idx = previous;

  ws.send(JSON.stringify({
    type: 'start',
    index: idx
  }));
}


// =============================
// PAUSE
// =============================

function pauseQuestion() {

  if (
    !ws ||
    ws.readyState !== WebSocket.OPEN
  ) {
    return;
  }

  ws.send(JSON.stringify({
    type: 'pause'
  }));
}


// =============================
// LEADERBOARD
// =============================

function requestLeaderboard() {

  if (
    !ws ||
    ws.readyState !== WebSocket.OPEN
  ) {
    return;
  }

  ws.send(JSON.stringify({
    type: 'leaderboard'
  }));
}


// =============================
// LEADERBOARD DISPLAY
// =============================

function showLeaderboard(items) {

  const old =
    document.getElementById(
      'leaderboardOverlay'
    );

  if (old) {
    old.remove();
  }

  const overlay =
    document.createElement('div');

  overlay.id =
    'leaderboardOverlay';

  overlay.className =
    'leaderboard-overlay';

  let rows = '';

  items.forEach(
    (player, index) => {

      const position =
        index + 1;

      let medal;

      if (position === 1) {
        medal = '🥇';
      } else if (position === 2) {
        medal = '🥈';
      } else if (position === 3) {
        medal = '🥉';
      } else {
        medal = position;
      }

      rows += `
        <div class="leaderboard-row ${
          position <= 3
            ? 'top-player'
            : ''
        }">

          <div class="rank">
            ${medal}
          </div>

          <div class="player-name">
            ${escapeHtml(player.name)}
          </div>

          <div class="player-score">
            ${player.score}
          </div>

        </div>
      `;
    }
  );

  if (!items.length) {

    rows = `
      <div class="empty-board">
        No participants yet
      </div>
    `;
  }

  overlay.innerHTML = `
    <div class="leaderboard-card">

      <div class="leaderboard-header">

        <div>
          <div class="leaderboard-title">
            🏆 LIVE LEADERBOARD
          </div>

          <div class="leaderboard-subtitle">
            Current scores
          </div>
        </div>

        <button
          class="leaderboard-close"
          id="closeLeaderboard">
          ✕
        </button>

      </div>

      <div class="leaderboard-columns">
        <div>RANK</div>
        <div>PARTICIPANT</div>
        <div>SCORE</div>
      </div>

      <div class="leaderboard-list">
        ${rows}
      </div>

    </div>
  `;

  document.body.appendChild(
    overlay
  );

  const close =
    document.getElementById(
      'closeLeaderboard'
    );

  if (close) {
    close.onclick =
      closeLeaderboard;
  }
}


function closeLeaderboard() {

  const overlay =
    document.getElementById(
      'leaderboardOverlay'
    );

  if (overlay) {
    overlay.remove();
  }
}


function escapeHtml(value) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// =============================
// PAGE BUTTONS
// =============================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    const create =
      $('create');

    if (create) {
      create.onclick =
        createRoom;
    }

    const start =
      $('start');

    if (start) {
      start.onclick =
        startQuestion;
    }

    const next =
      $('next');

    if (next) {
      next.onclick =
        startQuestion;
    }

    const prev =
      $('prev');

    if (prev) {
      prev.onclick =
        previousQuestion;
    }

    const pause =
      $('pause');

    if (pause) {
      pause.onclick =
        pauseQuestion;
    }

    const board =
      $('board');

    if (board) {
      board.onclick =
        requestLeaderboard;
    }
  }
);
