const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
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

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

const discordService = new DiscordService(io);

app.use('/api/discord', discordRoutes(discordService));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/accounts', (req, res) => {
  const accounts = db.prepare('SELECT id, username, avatar FROM accounts').all();
  res.json(accounts);
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
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