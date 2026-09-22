let ws;
let room = '';
let idx = -1;

const $ = id => document.getElementById(id);

function createRoom() {

  room = Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase();

  $('room').textContent = 'Room: ' + room;

  const joinUrl =
    location.origin + '/?room=' + room;

  $('joinurl').textContent = joinUrl;

  const qrUrl =
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' +
    encodeURIComponent(joinUrl);

  $('qr').src = qrUrl;

  connectHost();
}

function connectHost() {

  if (ws && ws.readyState === WebSocket.OPEN) {
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
    room +
    '&id=HOST'
  );

  ws.onopen = () => {

    $('status').textContent =
      'Host connected';

    $('start').disabled = false;
    $('next').disabled = false;
    $('prev').disabled = false;
    $('pause').disabled = false;
    $('board').disabled = false;
  };

  ws.onclose = () => {

    $('status').textContent =
      'Host disconnected';
  };

  ws.onmessage = event => {

    const message =
      JSON.parse(event.data);

    handleMessage(message);
  };
}

function handleMessage(message) {

  // PARTICIPANTS
  if (message.type === 'state') {

    $('count').textContent =
      message.players;

    const list = $('players');

    if (list) {

      list.innerHTML = '';

      message.names.forEach(name => {

        const li =
          document.createElement('li');

        li.textContent = name;

        list.appendChild(li);
      });
    }
  }

  // QUESTION
  if (message.type === 'question') {

    idx = message.index;

    $('question').textContent =
      message.question;

    $('round').textContent =
      'Round ' + message.round;

    $('timer').textContent =
      message.points + ' points';

    if ($('options')) {

      $('options').innerHTML = '';

      message.options.forEach((option, i) => {

        const div =
          document.createElement('div');

        div.className =
          'host-option';

        div.textContent =
          String.fromCharCode(65 + i) +
          '. ' +
          option;

        $('options').appendChild(div);
      });
    }
  }

  // TIMER
  if (message.type === 'tick') {

    $('timer').textContent =
      message.seconds + ' sec';
  }

  // QUESTION LOCKED
  if (message.type === 'locked') {

    $('timer').textContent =
      'LOCKED';

    $('timer').classList.add(
      'locked'
    );
  }

  // LEADERBOARD
  if (message.type === 'leaderboard') {

    showLeaderboard(
      message.items
    );
  }
}

function startQuestion() {

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  const questionIndex =
    idx + 1;

  if (questionIndex >= 30) {
    alert('Quiz completed!');
    return;
  }

  idx = questionIndex;

  ws.send(JSON.stringify({
    type: 'start',
    index: idx
  }));
}

function previousQuestion() {

  if (!ws || ws.readyState !== WebSocket.OPEN) {
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

function pauseQuestion() {

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(JSON.stringify({
    type: 'pause'
  }));
}

function showLeaderboard(items) {

  const existing =
    document.getElementById(
      'leaderboardOverlay'
    );

  if (existing) {
    existing.remove();
  }

  const overlay =
    document.createElement('div');

  overlay.id =
    'leaderboardOverlay';

  overlay.className =
    'leaderboard-overlay';

  let rows = '';

  items.forEach((player, index) => {

    const position =
      index + 1;

    let medal = '';

    if (position === 1) medal = '🥇';
    else if (position === 2) medal = '🥈';
    else if (position === 3) medal = '🥉';
    else medal = position;

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
  });

  if (items.length === 0) {

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
          onclick="closeLeaderboard()">
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


// BUTTON CONNECTIONS

document.addEventListener(
  'DOMContentLoaded',
  () => {

    if ($('create')) {
      $('create').onclick =
        createRoom;
    }

    if ($('start')) {
      $('start').onclick =
        startQuestion;
    }

    if ($('next')) {
      $('next').onclick =
        startQuestion;
    }

    if ($('prev')) {
      $('prev').onclick =
        previousQuestion;
    }

    if ($('pause')) {
      $('pause').onclick =
        pauseQuestion;
    }

    if ($('board')) {
      $('board').onclick = () => {

        if (
          !ws ||
          ws.readyState !==
          WebSocket.OPEN
        ) {
          return;
        }

        ws.send(JSON.stringify({
          type: 'leaderboard'
        }));
      };
    }
  }
);
