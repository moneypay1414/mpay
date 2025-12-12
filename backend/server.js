import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { setIO } from './utils/socket.js';

// Load .env from current working directory (backend) first
dotenv.config();
// If key env vars aren't present (e.g., running from backend/ but .env is in project root),
// attempt to load the workspace .env located one level up.
if (!process.env.MONGODB_URI) {
  const parentEnv = path.resolve(process.cwd(), '..', '.env');
  dotenv.config({ path: parentEnv });
}

import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import withdrawalRoutes from './routes/withdrawalRoutes.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const flash = require('connect-flash');

const app = express();
const httpServer = createServer(app);

// Allow both common frontend ports for development (5173, 5174)
// and also read from FRONTEND_URL env var if set
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174'
];
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// expose io to controllers via utils/socket.js to avoid circular imports
setIO(io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/moneypay';
// Log which URI is being used (mask credentials)
if (mongoUri.startsWith('mongodb+srv://')) {
  console.log('Using MongoDB URI: mongodb+srv://<cluster>');
} else if (mongoUri.startsWith('mongodb://')) {
  console.log(`Using MongoDB URI: ${mongoUri}`);
} else {
  console.log('Using MongoDB URI from environment');
}

mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/withdrawals', withdrawalRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Socket.io Real-time notifications
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-user', (userId) => {
    console.log(`User ${userId} joining room user-${userId}`);
    socket.join(`user-${userId}`);
    console.log(`User ${userId} successfully joined room user-${userId}`);
  });

  socket.on('send-notification', (data) => {
    io.to(`user-${data.userId}`).emit('new-notification', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Middleware for flash messages
app.use(flash());

// Route for admin verification
app.post('/api/admin/verify', (req, res) => {
  // Assuming verification logic here
  const isVerified = true; // Replace with actual verification logic

  if (isVerified) {
    req.flash('success_msg', 'Admin verified successfully!');
    return res.redirect('/admin/login'); // Redirect to admin login page
  } else {
    req.flash('error_msg', 'Verification failed. Please try again.');
    return res.redirect('/admin/verify'); // Redirect back to verification page
  }
});
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };
