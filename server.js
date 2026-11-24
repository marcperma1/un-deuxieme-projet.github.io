const express = require('express');
const http = require('node:http');
const { Server } = require('socket.io');
const path = require('node:path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 10_000,
  cors: { origin: true }
});
const PORT = Number(process.env.PORT) || 3000;
const MAX_PLAYERS_PER_ROOM = 8;
const rooms = new Map();
const lastUpdateAt = new Map();

app.use(express.static(__dirname));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

function cleanRoomCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}
function roomPlayers(roomCode) {
  return [...(rooms.get(roomCode)?.values() || [])];
}
function publishRoom(roomCode) {
  io.to(roomCode).emit('room:players', roomPlayers(roomCode));
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

io.on('connection', (socket) => {
  socket.on('room:join', (payload = {}, reply = () => {}) => {
    const roomCode = cleanRoomCode(payload.room);
    const name = String(payload.name || 'Pilote').trim().slice(0, 18) || 'Pilote';
    if (!roomCode) return reply({ ok: false, error: 'Entre un code de salon.' });

    const players = rooms.get(roomCode) || new Map();
    if (!players.has(socket.id) && players.size >= MAX_PLAYERS_PER_ROOM) {
      return reply({ ok: false, error: `Salon complet (maximum ${MAX_PLAYERS_PER_ROOM} joueurs).` });
    }

    if (socket.data.room && socket.data.room !== roomCode) {
      const previousRoom = socket.data.room;
      rooms.get(previousRoom)?.delete(socket.id);
      socket.leave(previousRoom);
      publishRoom(previousRoom);
      if (rooms.get(previousRoom)?.size === 0) rooms.delete(previousRoom);
    }

    socket.data.room = roomCode;
    socket.data.name = name;
    socket.join(roomCode);
    players.set(socket.id, {
      id: socket.id,
      name,
      x: 0,
      y: 0,
      angle: 0,
      speed: 0,
      color: `hsl(${Math.floor(Math.random() * 360)} 80% 62%)`
    });
    rooms.set(roomCode, players);
    reply({ ok: true, room: roomCode, id: socket.id });
    publishRoom(roomCode);
  });

  socket.on('car:update', (data = {}) => {
    const roomCode = socket.data.room;
    if (!roomCode) return;

    const now = Date.now();
    // Limit clients to 30 state updates per second.
    if (now - (lastUpdateAt.get(socket.id) || 0) < 33) return;
    lastUpdateAt.set(socket.id, now);

    const players = rooms.get(roomCode);
    const current = players?.get(socket.id);
    if (!current) return;
    const x = Number(data.x), y = Number(data.y), angle = Number(data.angle), speed = Number(data.speed);
    if (![x, y, angle, speed].every(Number.isFinite)) return;

    current.x = clamp(x, -5000, 5000);
    current.y = clamp(y, -5000, 5000);
    current.angle = clamp(angle, -Math.PI * 4, Math.PI * 4);
    current.speed = clamp(speed, -90, 470);
    socket.to(roomCode).emit('car:remote', current);
  });

  socket.on('disconnect', () => {
    const roomCode = socket.data.room;
    lastUpdateAt.delete(socket.id);
    if (!roomCode) return;
    rooms.get(roomCode)?.delete(socket.id);
    publishRoom(roomCode);
    if (rooms.get(roomCode)?.size === 0) rooms.delete(roomCode);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VIRAGE multijoueur prêt : http://localhost:${PORT}/multiplayer.html`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
