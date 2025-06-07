import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import 'express-async-errors';

import {
  errorHandler,
  notFoundHandler,
  setupProcessErrorHandlers,
  securityErrorHandler
} from './src/middleware/errorHandler.js';

import blockchainRoutes from './src/routes/blockchainRoutes.js';

class BitcoinChainServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.host = process.env.HOST || 'localhost';

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupProcessHandlers();
  }

  setupMiddleware() {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400
    }));

    this.app.use(express.json({
      limit: '10mb',
      strict: true
    }));

    this.app.use(express.urlencoded({
      extended: true,
      limit: '10mb'
    }));

    this.app.set('trust proxy', 1);

    this.app.use((req, res, next) => {
      res.setHeader('X-API-Version', '1.0.0');
      res.setHeader('X-Powered-By', 'BitcoinChain');
      res.setHeader('X-Response-Time', Date.now());
      next();
    });
  }

  setupRoutes() {
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Welcome to BitcoinChain API',
        version: '1.0.0',
        description: 'A production-ready blockchain implementation with Proof-of-Work',
        documentation: `${req.protocol}://${req.get('host')}/api/docs`,
        health: `${req.protocol}://${req.get('host')}/api/health`,
        endpoints: {
          blocks: `${req.protocol}://${req.get('host')}/api/blocks`,
          blockchain: `${req.protocol}://${req.get('host')}/api/blockchain`,
          objects: `${req.protocol}://${req.get('host')}/api/objects`
        },
        features: [
          'Proof-of-Work validation',
          'Complex object storage (Users & Transactions)',
          'JSON persistence',
          'Centralized error handling',

          'Rate limiting',
          'Input validation',
          'Blockchain integrity validation'
        ],
        timestamp: new Date().toISOString()
      });
    });

    this.app.use('/api', blockchainRoutes);

    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
  }

  setupErrorHandling() {
    this.app.use(securityErrorHandler);

    this.app.use(notFoundHandler);

    this.app.use(errorHandler);
  }

  setupProcessHandlers() {
    setupProcessErrorHandlers();

    const gracefulShutdown = (signal) => {
      console.log(`Received ${signal}, starting graceful shutdown...`);

      this.server.close((err) => {
        if (err) {
          console.error('Error during server shutdown', err.message);
          process.exit(1);
        }

        console.log('Server closed successfully');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  async start() {
    try {
      this.server = this.app.listen(this.port, this.host, () => {
        const serverUrl = `http://${this.host}:${this.port}`;

        console.log('\n🚀 BitcoinChain Server is running!');
        console.log(`📍 Server URL: ${serverUrl}`);
        console.log(`📚 API Documentation: ${serverUrl}/api/docs`);
        console.log(`💓 Health Check: ${serverUrl}/api/health`);
        console.log(`📊 Blockchain Stats: ${serverUrl}/api/blockchain/stats`);
        console.log('\n📋 Available Endpoints:');
        console.log(`   POST   ${serverUrl}/api/blocks - Create new block`);
        console.log(`   GET    ${serverUrl}/api/blocks - Get all blocks`);
        console.log(`   GET    ${serverUrl}/api/blocks/:index - Get specific block`);
        console.log(`   GET    ${serverUrl}/api/blocks/type/:type - Get blocks by type`);
        console.log(`   GET    ${serverUrl}/api/objects/:id - Find object by ID`);
        console.log(`   GET    ${serverUrl}/api/blockchain/validate - Validate blockchain`);
        console.log(`   POST   ${serverUrl}/api/blockchain/backup - Create backup`);
        console.log('\n🔧 Development tools:');
        console.log(`   Test with Postman or curl`);
        console.log(`   Blockchain data stored in ./data/ directory`);
        console.log('\n⚡ Ready to accept requests!\n');
      });

      this.server.on('error', (error) => {
        console.error('Server error occurred:', error.message);

        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${this.port} is already in use`);
          process.exit(1);
        }
      });

    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  }

  async stop() {
    if (this.server) {
      await new Promise((resolve, reject) => {
        this.server.close((err) => {
          if (err) {
            console.error('Error stopping server:', err.message);
            reject(err);
          } else {
            console.log('Server stopped successfully');
            resolve();
          }
        });
      });
    }
  }
}

const server = new BitcoinChainServer();

const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith('server.js');

if (isMainModule) {
  server.start().catch((error) => {
    console.error('Failed to start application:', error.message);
    process.exit(1);
  });
}

export default server; 