import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import {
  connectMongoDB,
  connectRedis,
  testConnections,
} from './database/connection';
import { setupDatabase } from './database/setup';
import { GameSocketServer } from './services/GameSocketServer';

// Routes
import authRoutes from './routes/auth';
import inventoryRoutes from './routes/inventory';
import monsterRoutes from './routes/monsters';

dotenv.config();

const app = express();
// Increase header size limits to prevent 431 errors
const server = createServer(app, {
  maxHeaderSize: 16384, // 16KB (default is 8KB)
});
const PORT = process.env.PORT || 3000;

// Debug middleware to log request headers (remove in production)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📋 ${req.method} ${req.url}`);
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));

    const headerSize = JSON.stringify(req.headers).length;
    console.log(`📋 Header size: ${headerSize} bytes`);

    if (headerSize > 4000) {
      // Log if headers are large
      console.log('🔍 Large headers detected:', {
        size: headerSize,
        headers: Object.keys(req.headers),
        url: req.url,
      });
    }
    next();
  });
}

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin requests
  })
);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
    maxAge: 86400, // Cache preflight for 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 200,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (images)
app.use('/images', express.static('public/images'));

// Handle 431 errors specifically
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err.code === 'HPE_HEADER_OVERFLOW' || err.status === 431) {
      console.error('🚫 Header size limit exceeded:', {
        url: req.url,
        headers: Object.keys(req.headers),
        headerSize: JSON.stringify(req.headers).length,
      });
      return res.status(431).json({
        success: false,
        error:
          'Request headers too large. Please clear your browser cookies and try again.',
      });
    }
    next(err);
  }
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Kairox Monster Battler API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/monsters', monsterRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);

    res.status(err.status || 500).json({
      success: false,
      error: 'Internal server error',
      message:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'Something went wrong',
    });
  }
);

// Initialize Socket.IO server
const gameSocketServer = new GameSocketServer(server);

// Database connections and server startup
async function startServer() {
  try {
    console.log('🔄 Connecting to databases...');

    // Connect to databases
    await connectMongoDB();
    await connectRedis();

    // Test connections
    await testConnections();

    // Setup database tables and demo data
    await setupDatabase();

    console.log('✅ All database connections established');

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.IO server ready for real-time battles`);
      console.log(`🌐 API available at http://localhost:${PORT}/api`);
      console.log(`💊 Health check at http://localhost:${PORT}/health`);

      if (process.env.NODE_ENV === 'development') {
        console.log('\n📋 Available API endpoints:');
        console.log('   POST /api/auth/register');
        console.log('   POST /api/auth/login');
        console.log('   GET  /api/inventory/monsters');
        console.log('   GET  /api/inventory/equipment');
        console.log('   POST /api/monsters/upgrade');
        console.log('   GET  /api/inventory/shop/monsters');
        console.log('   GET  /api/inventory/shop/equipment');
        console.log('\n🎮 Socket.IO events:');
        console.log('   join_lobby - Join matchmaking lobby');
        console.log('   select_monsters - Select monsters for battle');
        console.log('   use_skill - Use skill in combat');
        console.log('   leave_lobby - Leave matchmaking');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

export default app;
