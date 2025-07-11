import { Pool } from 'pg';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection
export const pgPool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// MongoDB connection
export const connectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGODB_URL!);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Redis connection
export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Redis connection error:', error);
    process.exit(1);
  }
};

// Test database connections
export const testConnections = async (): Promise<void> => {
  try {
    // Test PostgreSQL
    const pgResult = await pgPool.query('SELECT NOW()');
    console.log('PostgreSQL connected:', pgResult.rows[0]);

    // Test Redis
    await redisClient.ping();
    console.log('Redis connected: PONG received');

    // MongoDB connection is tested during connection
  } catch (error) {
    console.error('Database connection test failed:', error);
    throw error;
  }
};

// Graceful shutdown
export const closeConnections = async (): Promise<void> => {
  try {
    await pgPool.end();
    await redisClient.quit();
    await mongoose.connection.close();
    console.log('All database connections closed');
  } catch (error) {
    console.error('Error closing connections:', error);
  }
};

process.on('SIGINT', closeConnections);
process.on('SIGTERM', closeConnections);
