const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('./db');
const DiscordService = require('./services/discordService');
const discordRoutes = require('./routes/discord');
const { requireAuth, JWT_SECRET } = require('./middleware/auth');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Master Password Check
const MASTER_PASSWORD = process.env.CORDVERSE_PASSWORD;
if (!MASTER_PASSWORD) {
  console.warn("⚠️  WARNING: CORDVERSE_PASSWORD is not set in .env! The app is insecure.");
}

app.use(cors());
app.use(express.json());

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

const discordService = new DiscordService(io);

// Auth Route
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  
  if (!MASTER_PASSWORD) {
    return res.status(500).json({ error: 'Server security not configured (CORDVERSE_PASSWORD missing)' });
  }

  if (password === MASTER_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Invalid password' });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({ valid: true });
});

// Protected Routes
app.use('/api/discord', requireAuth, discordRoutes(discordService));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/accounts', requireAuth, (req, res) => {
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