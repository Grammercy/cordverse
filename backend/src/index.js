const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');
const DiscordService = require('./services/discordService');
const discordRoutes = require('./routes/discord');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const discordService = new DiscordService(io);

app.use('/api/discord', discordRoutes(discordService));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/accounts', (req, res) => {
  const accounts = db.prepare('SELECT id, username, avatar FROM accounts').all();
  res.json(accounts);
});

io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});