const redis = require('redis');

// Configure Redis with retry strategy
const redisClient = redis.createClient({
  url: 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      // Maximum retry delay is 30 seconds
      const delay = Math.min(retries * 1000, 30000);
      console.log(`Retrying Redis connection in ${delay}ms...`);
      return delay;
    }
  }
});

// Connect and handle connection events
redisClient.connect().catch(err => {
  console.error('❌ Redis initial connection failed:', err);
  console.log('Application will continue and retry Redis connection automatically');
});

// Handle connected event
redisClient.on('connect', () => {
  console.log('✅ Redis client connected');
});

// Handle connection error
redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

// Handle reconnected event
redisClient.on('reconnecting', () => {
  console.log('🔄 Redis client reconnecting...');
});

// Handle end event
redisClient.on('end', () => {
  console.log('⚠️ Redis client connection closed');
});

// Enhanced Redis client with more resilient methods
const enhancedRedisClient = {
  isReady: false,
  
  // Get value with fallback
  async get(key) {
    try {
      if (!redisClient.isReady) {
        console.log('⚠️ Redis not ready when attempting to get', key);
        return null;
      }
      
      this.isReady = true;
      return await redisClient.get(key);
    } catch (err) {
      console.error(`❌ Redis get error for key ${key}:`, err);
      this.isReady = false;
      return null;
    }
  },
  
  // Set value with error handling
  async setEx(key, ttl, value) {
    try {
      if (!redisClient.isReady) {
        console.log('⚠️ Redis not ready when attempting to set', key);
        return false;
      }
      
      this.isReady = true;
      await redisClient.setEx(key, ttl, value);
      return true;
    } catch (err) {
      console.error(`❌ Redis setEx error for key ${key}:`, err);
      this.isReady = false;
      return false;
    }
  },
  
  // Clean up resources if needed
  async quit() {
    try {
      if (redisClient.isReady) {
        await redisClient.quit();
      }
    } catch (err) {
      console.error('Error while closing Redis connection:', err);
    }
  }
};

// Update isReady status based on Redis client's status
setInterval(() => {
  enhancedRedisClient.isReady = redisClient.isReady;
}, 5000);

module.exports = enhancedRedisClient;