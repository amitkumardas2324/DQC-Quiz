let ws = null;
let playerId = null;
let room = null;
let playerName = null;

const $ = id =>
  document.getElementById(id);


// =========================
// JOIN QUIZ
// =========================

function joinQuiz() {

  playerName =
    $('name').value.trim();

  room =
    $('room').value.trim().toUpperCase();

  if (!playerName) {
    alert('Please enter your name.');
    return;
  }

  if (!room) {
    alert('Please enter the room code.');
    return;
  }

  playerId =
    Math.random()
      .toString(36)
      .slice(2, 10);

  const protocol =
    location.protocol === 'https:'
      ? 'wss:'
      : 'ws:';

  const wsUrl =
    protocol +
    '//' +
    location.host +
    '/ws?room=' +
    encodeURIComponent(room) +
    '&id=' +
    encodeURIComponent(playerId) +
    '&name=' +
    encodeURIComponent(playerName);

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {

    $('joinScreen').style.display =
      'none';

    $('quizScreen').style.display =
      'block';

    if ($('playerName')) {
      $('playerName').textContent =
        playerName;
    }

    if ($('roomDisplay')) {
      $('roomDisplay').textContent =
        room;
    }
  };

  ws.onclose = () => {

    alert(
      'Connection closed. Please refresh and join again.'
    );
  };

  ws.onmessage = event => {

    const message =
      JSON.parse(event.data);

    handleMessage(message);
  };
}


// =========================
// SERVER MESSAGES
// =========================

function handleMessage(message) {

  // PARTICIPANT STATE
  if (message.type === 'state') {

    if ($('participantCount')) {

      $('participantCount').textContent =
        message.players;
    }
  }


  // NEW QUESTION
  if (message.type === 'question') {

    closeLeaderboard();

    showQuestion(message);
  }


  // TIMER
  if (message.type === 'tick') {

    updateTimer(
      message.seconds
    );
  }


  // QUESTION LOCKED
  if (message.type === 'locked') {

    lockQuestion();

    updateTimer(0);
  }


  // ANSWER RESULT
  if (message.type === 'result') {

    showResult(message);
  }


  // LEADERBOARD
  if (message.type === 'leaderboard') {

    showLeaderboard(
      message.items
    );
  }
}


// =========================
// SHOW QUESTION
// =========================

function showQuestion(message) {

  if ($('question')) {

    $('question').textContent =
      message.question;
  }

  if ($('round')) {

    $('round').textContent =
      'Round ' + message.round;
  }

  const options =
    $('options');

  if (!options) {
    return;
  }

  options.innerHTML = '';

  message.options.forEach(
    (option, index) => {

      const button =
        document.createElement(
          'button'
        );

      button.className =
        'answer-button';

      button.textContent =
        String.fromCharCode(
          65 + index
        ) +
        '. ' +
        option;

      button.onclick = () => {

        submitAnswer(
          index
        );
      };

      options.appendChild(
        button
      );
    }
  );
}


// =========================
// SUBMIT ANSWER
// =========================

function submitAnswer(answer) {

  if (
    !ws ||
    ws.readyState !==
    WebSocket.OPEN
  ) {
    return;
  }

  const buttons =
    document.querySelectorAll(
      '.answer-button'
    );

  buttons.forEach(button => {
    button.disabled = true;
  });

  ws.send(JSON.stringify({
    type: 'answer',
    answer: answer
  }));
}


// =========================
// TIMER
// =========================

function updateTimer(seconds) {

  const timer =
    $('timer');

  if (!timer) {
    return;
  }

  timer.textContent =
    seconds;

  if (seconds <= 5) {

    timer.classList.add(
      'danger'
    );

  } else {

    timer.classList.remove(
      'danger'
    );
  }
}


// =========================
// LOCK QUESTION
// =========================

function lockQuestion() {

  const buttons =
    document.querySelectorAll(
      '.answer-button'
    );

  buttons.forEach(button => {
    button.disabled = true;
  });
}


// =========================
// ANSWER RESULT
// =========================

function showResult(message) {

  const result =
    $('result');

  if (!result) {
    return;
  }

  if (message.correct) {

    result.textContent =
      '✅ Correct! +100 points';

    result.className =
      'result correct';

  } else {

    result.textContent =
      '❌ Incorrect! +0 points';

    result.className =
      'result wrong';
  }

  result.style.display =
    'block';

  if ($('score')) {

    $('score').textContent =
      message.score;
  }
}


// =========================
// LEADERBOARD
// =========================

function showLeaderboard(items) {

  closeLeaderboard();

  const overlay =
    document.createElement(
      'div'
    );

  overlay.id =
    'leaderboardOverlay';

  overlay.className =
    'leaderboard-overlay';

  let rows = '';

  items.forEach(
    (player, index) => {

      const position =
        index + 1;

      let medal = '';

      if (position === 1) {
        medal = '🥇';
      } else if (position === 2) {
        medal = '🥈';
      } else if (position === 3) {
        medal = '🥉';
      } else {
        medal = position;
      }

      const isMe =
        player.id === playerId;

      rows += `
        <div class="leaderboard-row ${
          position <= 3
            ? 'top-player'
            : ''
        } ${
          isMe
            ? 'my-position'
            : ''
        }">

          <div class="rank">
            ${medal}
          </div>

          <div class="player-name">
            ${escapeHtml(player.name)}
            ${
              isMe
                ? '<span class="you-label">YOU</span>'
                : ''
            }
          </div>

          <div class="player-score">
            ${player.score}
          </div>

        </div>
      `;
    }
  );

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
            🏆 LEADERBOARD
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


// =========================
// SECURITY
// =========================

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// =========================
// BUTTON
// =========================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    if ($('joinButton')) {

      $('joinButton').onclick =
        joinQuiz;
    }
  }
);
