import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes';
import { createRedisClient } from './config/redis';

// Load config
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable JSON bodies and CORS for dashboard & app requests
app.use(cors({ origin: '*' }));
app.use(express.json());

// API routing
app.use('/api/v1', apiRouter);

// Base health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Setup server wrap for Socket.IO
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.io connection logging
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// Initialize dedicated Redis Subscriber client for WebSockets
const redisSubscriber = createRedisClient();

async function startServer() {
  // Try connecting Redis subscriber safely
  try {
    await redisSubscriber.connect();
    console.log('Redis subscriber connected successfully');

    await redisSubscriber.subscribe('bin:telemetry', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        io.emit('bin:telemetry', parsedMessage);
      } catch (err) {
        console.error('Failed to parse telemetry pub/sub message:', err);
      }
    });

    await redisSubscriber.subscribe('bin:overflow', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        io.emit('bin:overflow', parsedMessage);
      } catch (err) {
        console.error('Failed to parse overflow alert pub/sub message:', err);
      }
    });
  } catch (err) {
    console.warn('Redis pub/sub subscriber offline. WebSockets running in direct broadcasting mode.');
  }

  // Start HTTP Server listening on port 5000 unconditionally
  server.listen(port, () => {
    console.log(`BinSINAG Backend Server listening on port ${port}`);
  });
}

startServer();
