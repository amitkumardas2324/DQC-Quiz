let ws = null;
let playerId = null;
let room = null;
let playerName = null;

const $ = id =>
  document.getElementById(id);


// ==============================
// JOIN QUIZ
// ==============================

function joinQuiz() {

  const nameInput = $('name');
  const roomInput = $('room');
  const errorBox = $('joinError');

  playerName =
    nameInput.value.trim();

  room =
    roomInput.value.trim().toUpperCase();


  // Validate name

  if (!playerName) {

    showJoinError(
      'Please enter your name.'
    );

    nameInput.focus();

    return;
  }


  // Validate room

  if (!room) {

    showJoinError(
      'Please enter the room code.'
    );

    roomInput.focus();

    return;
  }


  // Generate unique player ID

  playerId =
    Math.random()
      .toString(36)
      .substring(2, 10);


  // WebSocket protocol

  const protocol =
    window.location.protocol === 'https:'
      ? 'wss:'
      : 'ws:';


  const wsUrl =
    protocol +
    '//' +
    window.location.host +
    '/ws?room=' +
    encodeURIComponent(room) +
    '&id=' +
    encodeURIComponent(playerId) +
    '&name=' +
    encodeURIComponent(playerName);


  console.log(
    'Connecting to:',
    wsUrl
  );


  try {

    ws =
      new WebSocket(wsUrl);

  } catch (error) {

    console.error(error);

    showJoinError(
      'Unable to connect. Please refresh and try again.'
    );

    return;
  }


  // Disable button while connecting

  const joinButton =
    $('joinButton');

  if (joinButton) {

    joinButton.disabled =
      true;

    joinButton.textContent =
      'Connecting...';
  }


  // Connected

  ws.onopen = () => {

    console.log(
      'Connected to quiz server'
    );

    hideJoinError();

    const joinScreen =
      $('joinScreen');

    const quizScreen =
      $('quizScreen');


    if (joinScreen) {
      joinScreen.style.display =
        'none';
    }

    if (quizScreen) {
      quizScreen.style.display =
        'block';
    }


    if ($('playerName')) {

      $('playerName').textContent =
        playerName;
    }


    if ($('roomDisplay')) {

      $('roomDisplay').textContent =
        room;
    }
  };


  // Server error

  ws.onerror = error => {

    console.error(
      'WebSocket error:',
      error
    );

    showJoinError(
      'Could not connect to the quiz. Please try again.'
    );

    resetJoinButton();
  };


  // Connection closed

  ws.onclose = () => {

    console.log(
      'WebSocket disconnected'
    );

    resetJoinButton();
  };


  // Messages

  ws.onmessage = event => {

    let message;

    try {

      message =
        JSON.parse(event.data);

    } catch (error) {

      console.error(
        'Invalid server message:',
        event.data
      );

      return;
    }

    handleMessage(message);
  };
}


// ==============================
// ERROR DISPLAY
// ==============================

function showJoinError(message) {

  const errorBox =
    $('joinError');

  if (!errorBox) {
    alert(message);
    return;
  }

  errorBox.textContent =
    message;

  errorBox.style.display =
    'block';
}


function hideJoinError() {

  const errorBox =
    $('joinError');

  if (errorBox) {
    errorBox.style.display =
      'none';
  }
}


function resetJoinButton() {

  const button =
    $('joinButton');

  if (button) {

    button.disabled =
      false;

    button.textContent =
      '🚀 Join Quiz';
  }
}


// ==============================
// SERVER MESSAGES
// ==============================

function handleMessage(message) {


  // Player state

  if (message.type === 'state') {

    if ($('participantCount')) {

      $('participantCount').textContent =
        message.players;
    }

    return;
  }


  // New question

  if (message.type === 'question') {

    closeLeaderboard();

    showQuestion(message);

    return;
  }


  // Timer

  if (message.type === 'tick') {

    updateTimer(
      message.seconds
    );

    return;
  }


  // Locked

  if (message.type === 'locked') {

    lockQuestion();

    updateTimer(0);

    return;
  }


  // Answer result

  if (message.type === 'result') {

    showResult(message);

    return;
  }


  // Leaderboard

  if (message.type === 'leaderboard') {

    showLeaderboard(
      message.items
    );

    return;
  }
}


// ==============================
// SHOW QUESTION
// ==============================

function showQuestion(message) {

  const question =
    $('question');

  if (question) {

    question.textContent =
      message.question;
  }


  const round =
    $('round');

  if (round) {

    round.textContent =
      'Round ' +
      message.round;
  }


  const result =
    $('result');

  if (result) {

    result.style.display =
      'none';

    result.textContent = '';
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

      button.type =
        'button';

      button.className =
        'answer-button';

      button.textContent =
        String.fromCharCode(
          65 + index
        ) +
        '. ' +
        option;

      button.onclick = () => {

        submitAnswer(index);
      };

      options.appendChild(
        button
      );
    }
  );
}


// ==============================
// SUBMIT ANSWER
// ==============================

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

    button.disabled =
      true;
  });


  ws.send(
    JSON.stringify({
      type: 'answer',
      answer: answer
    })
  );
}


// ==============================
// TIMER
// ==============================

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


// ==============================
// LOCK QUESTION
// ==============================

function lockQuestion() {

  const buttons =
    document.querySelectorAll(
      '.answer-button'
    );


  buttons.forEach(button => {

    button.disabled =
      true;
  });
}


// ==============================
// RESULT
// ==============================

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


// ==============================
// LEADERBOARD
// ==============================

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


      const isMe =
        player.id === playerId;


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


  if (!items.length) {

    rows = `
      <div style="
        padding:30px;
        text-align:center;
        opacity:.6;
      ">
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
          type="button">
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


  const closeButton =
    overlay.querySelector(
      '.leaderboard-close'
    );


  if (closeButton) {

    closeButton.onclick =
      closeLeaderboard;
  }
}


// ==============================
// CLOSE LEADERBOARD
// ==============================

function closeLeaderboard() {

  const overlay =
    document.getElementById(
      'leaderboardOverlay'
    );

  if (overlay) {
    overlay.remove();
  }
}


// ==============================
// HTML ESCAPE
// ==============================

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// ==============================
// JOIN BUTTON
// ==============================

document.addEventListener(
  'DOMContentLoaded',
  () => {

    const joinButton =
      $('joinButton');


    if (joinButton) {

      joinButton.addEventListener(
        'click',
        joinQuiz
      );
    }


    // Also allow ENTER key

    const nameInput =
      $('name');

    const roomInput =
      $('room');


    if (nameInput) {

      nameInput.addEventListener(
        'keydown',
        event => {

          if (
            event.key === 'Enter'
          ) {
            joinQuiz();
          }

        }
      );
    }


    if (roomInput) {

      roomInput.addEventListener(
        'keydown',
        event => {

          if (
            event.key === 'Enter'
          ) {
            joinQuiz();
          }

        }
      );
    }
  }
);
