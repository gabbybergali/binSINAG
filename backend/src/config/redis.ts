import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const createRedisClient = () => {
  const client = createClient({ 
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 3) return new Error('Redis connection failed');
        return Math.min(retries * 500, 2000);
      }
    }
  });
  client.on('error', (err) => {
    // Silent catch to prevent console flooding if Docker Redis is offline
  });
  return client;
};

// Main Redis client for general queries/caching
export const redisClient = createRedisClient();

// Connect safely
redisClient.connect().then(() => {
  console.log('Connected to Redis server');
}).catch((err) => {
  console.warn('Redis server offline. Backend running in standalone mode.');
});
