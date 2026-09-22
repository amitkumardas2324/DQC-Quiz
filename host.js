let ws, room, idx = -1;

function createRoom() {
  room = Math.random().toString(36).slice(2, 7).toUpperCase();

  document.getElementById('room').textContent = 'Room: ' + room;

  const u = location.origin + '/';
  document.getElementById('joinurl').textContent =
    u + '?room=' + room;

  const qr =
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' +
    encodeURIComponent(u + '?room=' + room);

  document.getElementById('qr').src = qr;
  document.getElementById('qr').classList.remove('hidden');

  const p = location.protocol === 'https:' ? 'wss' : 'ws';

  ws = new WebSocket(
    p + '://' + location.host +
    '/ws?room=' + room + '&id=HOST&name=HOST'
  );

  ws.onmessage = e => msg(JSON.parse(e.data));
}

function msg(m) {
  if (m.type === 'state') {
    document.getElementById('count').textContent = m.players;

    document.getElementById('players').innerHTML =
      m.names.map(x =>
        '<div class="player">' + x + '</div>'
      ).join('');
  }

  if (m.type === 'question') {
    idx = m.index;

    document.getElementById('title').textContent =
      'Question ' + (idx + 1) + ' / 30';

    document.getElementById('hq').textContent = m.question;
  }

  if (m.type === 'tick') {
    document.getElementById('htimer').textContent = m.seconds;
  }

  if (m.type === 'answers') {
    document.getElementById('answers').innerHTML =
      m.items.map(x =>
        '<div class="player">' +
        x.name + ' — ' +
        (x.answer === null
          ? 'No answer'
          : String.fromCharCode(65 + x.answer)) +
        ' ' +
        (x.correct ? '✅' : '') +
        '</div>'
      ).join('');
  }

  if (m.type === 'leaderboard') {
    alert(
      m.items.map((x, i) =>
        (i + 1) + '. ' + x.name + ' — ' + x.score
      ).join('\n')
    );
  }
}

function next() {
  if (!ws) {
    alert('Please create a room first.');
    return;
  }

  idx++;

  if (idx > 29) idx = 29;

  ws.send(JSON.stringify({
    type: 'start',
    index: idx
  }));
}

function prev() {
  if (!ws) {
    alert('Please create a room first.');
    return;
  }

  idx = Math.max(0, idx - 1);

  ws.send(JSON.stringify({
    type: 'start',
    index: idx
  }));
}

function pause() {
  if (!ws) {
    alert('Please create a room first.');
    return;
  }

  ws.send(JSON.stringify({
    type: 'pause'
  }));
}

function board() {
  if (!ws) {
    alert('Please create a room first.');
    return;
  }

  ws.send(JSON.stringify({
    type: 'leaderboard'
  }));
}
