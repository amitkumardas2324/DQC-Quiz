const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const WebSocket = require('ws');

const Q = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf8')
);

const rooms = new Map();
const port = process.env.PORT || 3000;

// HTTP server
const s = http.createServer((req, res) => {
  let p = url.parse(req.url).pathname;

  if (p === '/') p = '/index.html';
  if (p === '/host') p = '/host.html';

  const f = path.join(__dirname, p);

  if (!fs.existsSync(f)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }

  let contentType = 'text/html';

  if (p.endsWith('.css')) {
    contentType = 'text/css';
  } else if (p.endsWith('.js')) {
    contentType = 'application/javascript';
  } else if (p.endsWith('.json')) {
    contentType = 'application/json';
  }

  res.writeHead(200, {
    'Content-Type': contentType + '; charset=utf-8'
  });

  res.end(fs.readFileSync(f));
});

// WebSocket server
const w = new WebSocket.Server({
  server: s,
  path: '/ws'
});

const send = (client, message) => {
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
};

const broadcast = (room, message) => {
  send(room.host, message);

  for (const player of room.players.values()) {
    send(player.ws, message);
  }
};

const getState = (room) => ({
  type: 'state',
  players: room.players.size,
  names: [...room.players.values()].map(player => player.name)
});

// WebSocket connection
w.on('connection', (ws, req) => {
  const params = new URL(
    req.url,
    'http://localhost'
  ).searchParams;

  const roomCode = params.get('room');
  const id = params.get('id');
  const name = params.get('name') || 'Player';

  if (!roomCode) {
    ws.close();
    return;
  }

  // Create room if it doesn't exist
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      players: new Map(),
      host: null,
      i: -1,
      timer: null,
      left: 0,
      answers: new Map(),
      scores: new Map(),
      lock: false
    });
  }

  const room = rooms.get(roomCode);

  // Host connection
  if (id === 'HOST') {
    room.host = ws;
    ws.host = true;
  }

  // Player connection
  else {
    room.players.set(id, {
      ws: ws,
      name: name
    });

    if (!room.scores.has(id)) {
      room.scores.set(id, 0);
    }
  }

  send(ws, getState(room));
  broadcast(room, getState(room));

  // Messages
  ws.on('message', data => {
    let message;

    try {
      message = JSON.parse(data);
    } catch (error) {
      return;
    }

    // HOST CONTROLS
    if (ws.host) {

      // Start / next question
      if (message.type === 'start') {
        clearInterval(room.timer);

        room.i = message.index;
        room.answers.clear();
        room.lock = false;

        const question = Q[room.i];

        if (!question) {
          return;
        }

        room.left = question.time;

        broadcast(room, {
          type: 'question',
          index: room.i,
          round: question.round,
          question: question.question,
          options: question.options,
          points: 100
        });

        broadcast(room, {
          type: 'tick',
          seconds: room.left
        });

        room.timer = setInterval(() => {
          room.left--;

          broadcast(room, {
            type: 'tick',
            seconds: room.left
          });

          if (room.left <= 0) {
            clearInterval(room.timer);

            room.lock = true;

            broadcast(room, {
              type: 'locked'
            });
          }
        }, 1000);
      }

      // Pause timer
      if (message.type === 'pause') {
        clearInterval(room.timer);
      }

      // Leaderboard
      if (message.type === 'leaderboard') {
        const leaderboard = [...room.players].map(
          ([playerId, player]) => ({
            name: player.name,
            score: room.scores.get(playerId) || 0
          })
        );

        leaderboard.sort((a, b) => b.score - a.score);

        send(ws, {
          type: 'leaderboard',
          items: leaderboard
        });
      }
    }

    // PLAYER ANSWER
    else if (
      message.type === 'answer' &&
      !room.lock &&
      !room.answers.has(id)
    ) {
      room.answers.set(id, message.answer);

      const question = Q[room.i];

      if (!question) {
        return;
      }

      const correct = message.answer === question.answer;

      // FIXED SCORING:
      // Correct answer = 100 points
      // Wrong answer = 0 points
      const points = correct ? 100 : 0;

      const currentScore = room.scores.get(id) || 0;
      const newScore = currentScore + points;

      room.scores.set(id, newScore);

      send(ws, {
        type: 'result',
        correct: correct,
        points: points,
        score: newScore
      });

      // Lock question when everyone has answered
      if (
        room.answers.size === room.players.size &&
        room.players.size > 0
      ) {
        clearInterval(room.timer);

        room.lock = true;

        broadcast(room, {
          type: 'locked'
        });
      }
    }
  });

  // Connection closed
  ws.on('close', () => {
    if (ws.host) {
      room.host = null;
    } else {
      room.players.delete(id);
      broadcast(room, getState(room));
    }
  });
});

// Start server
s.listen(port, () => {
  console.log('DQC quiz on ' + port);
});
