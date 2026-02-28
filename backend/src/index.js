const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const config = require('./config');

// Middleware
const authMiddleware = require('./middleware/auth');
const botAuth = require('./middleware/botAuth');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const questRoutes = require('./routes/quests');
const photoRoutes = require('./routes/photos');
const messageRoutes = require('./routes/messages');
const botRoutes = require('./routes/bot');
const dashboardRoutes = require('./routes/dashboard');
const clueRoutes = require('./routes/clues');
const songRoutes = require('./routes/songs');
const votingRoutes = require('./routes/voting');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:80', 'http://localhost'],
    credentials: true,
  },
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Admin connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Admin disconnected:', socket.id);
  });
});

// Express middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:80', 'http://localhost'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Public routes
app.use('/api/auth', authRoutes);

// Bot routes (API key auth)
app.use('/api/bot', botAuth, botRoutes);

// Protected routes (JWT auth)
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/teams', authMiddleware, teamRoutes);
app.use('/api/quests', authMiddleware, questRoutes);
app.use('/api/photos', authMiddleware, photoRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/clues', authMiddleware, clueRoutes);
app.use('/api/songs', authMiddleware, songRoutes);
app.use('/api/voting', authMiddleware, votingRoutes);

// Connect to MongoDB and start server
mongoose
  .connect(config.mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(config.port, () => {
      console.log(`🚀 Backend running on port ${config.port}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = { app, server, io };
