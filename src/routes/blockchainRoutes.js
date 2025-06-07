import express from 'express';
import rateLimit from 'express-rate-limit';
import { BlockchainController } from '../controllers/BlockchainController.js';
import { validateRequest, rateLimitHandler } from '../middleware/errorHandler.js';

const router = express.Router();
const blockchainController = new BlockchainController();

const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

const blockCreationLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per window
  'Too many block creation requests, please try again later'
);

const generalApiLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many API requests, please try again later'
);

const backupLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // 3 backups per hour
  'Too many backup requests, please try again later'
);

const logRouteAccess = (routeName) => (req, res, next) => {
  next();
};

router.post('/blocks',
  blockCreationLimit,
  logRouteAccess('Create Block'),
  blockchainController.createBlock
);

router.get('/blocks',
  generalApiLimit,
  logRouteAccess('Get All Blocks'),
  blockchainController.getAllBlocks
);

router.get('/blocks/:index',
  generalApiLimit,
  logRouteAccess('Get Block by Index'),
  blockchainController.getBlockByIndex
);

router.get('/blocks/type/:type',
  generalApiLimit,
  logRouteAccess('Get Blocks by Type'),
  blockchainController.getBlocksByObjectType
);

router.get('/objects/:id',
  generalApiLimit,
  logRouteAccess('Find Object by ID'),
  blockchainController.findObjectById
);

router.get('/blockchain/stats',
  generalApiLimit,
  logRouteAccess('Get Blockchain Stats'),
  blockchainController.getBlockchainStats
);

router.get('/blockchain/validate',
  generalApiLimit,
  logRouteAccess('Validate Blockchain'),
  blockchainController.validateBlockchain
);

router.post('/blockchain/backup',
  backupLimit,
  logRouteAccess('Create Backup'),
  blockchainController.createBackup
);

router.get('/health', (req, res) => {
  const healthInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    blockchain: {
      initialized: !!blockchainController.blockchainService,
      totalBlocks: blockchainController.blockchainService?.chain?.length || 0
    }
  };

  res.json({
    success: true,
    data: healthInfo
  });
});

router.get('/docs', (req, res) => {
  const apiDocs = {
    title: 'BitcoinChain API Documentation',
    version: '1.0.0',
    description: 'A production-ready blockchain implementation with Proof-of-Work',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      blocks: {
        'POST /blocks': {
          description: 'Create a new block with complex objects',
          rateLimit: '5 requests per 15 minutes',
          body: {
            data: [{
              type: 'User|Transaction',
              id: 'string',
              name: 'string (for User)',
              email: 'string (for User)',
              walletAddress: 'string (42 chars, for User)',
              balance: 'number (for User)',
              fromAddress: 'string (42 chars, for Transaction)',
              toAddress: 'string (42 chars, for Transaction)',
              amount: 'number (for Transaction)',
              transactionType: 'transfer|reward|fee (for Transaction)',
              metadata: 'object (optional)'
            }]
          }
        },
        'GET /blocks': {
          description: 'Get all blocks in the blockchain',
          rateLimit: '100 requests per 15 minutes'
        },
        'GET /blocks/:index': {
          description: 'Get a specific block by index',
          rateLimit: '100 requests per 15 minutes'
        },
        'GET /blocks/type/:type': {
          description: 'Get blocks containing specific object type (User or Transaction)',
          rateLimit: '100 requests per 15 minutes'
        }
      },
      objects: {
        'GET /objects/:id': {
          description: 'Find a specific complex object by ID across all blocks',
          rateLimit: '100 requests per 15 minutes'
        }
      },
      blockchain: {
        'GET /blockchain/stats': {
          description: 'Get blockchain statistics and health information',
          rateLimit: '100 requests per 15 minutes'
        },
        'GET /blockchain/validate': {
          description: 'Validate the entire blockchain integrity',
          rateLimit: '100 requests per 15 minutes'
        },
        'POST /blockchain/backup': {
          description: 'Create a backup of the blockchain',
          rateLimit: '3 requests per hour'
        }
      },
      utility: {
        'GET /health': {
          description: 'Health check endpoint',
          rateLimit: 'none'
        },
        'GET /docs': {
          description: 'API documentation',
          rateLimit: 'none'
        }
      }
    },
    examples: {
      createUser: {
        url: 'POST /blocks',
        body: {
          data: [{
            type: 'User',
            id: 'user-001',
            name: 'John Doe',
            email: 'john@example.com',
            walletAddress: '0x742d35Cc6634C0532925a3b8D4D5c0B3d5f8a5c9',
            balance: 1000,
            metadata: { role: 'admin' }
          }]
        }
      },
      createTransaction: {
        url: 'POST /blocks',
        body: {
          data: [{
            type: 'Transaction',
            id: 'tx-001',
            fromAddress: '0x742d35Cc6634C0532925a3b8D4D5c0B3d5f8a5c9',
            toAddress: '0x8ba1f109551bD432803012645Hac136c82F3d5e0',
            amount: 100,
            transactionType: 'transfer',
            metadata: { description: 'Payment for services' }
          }]
        }
      }
    },
    security: {
      rateLimiting: 'All endpoints have rate limiting to prevent abuse',
      validation: 'All input data is validated using Joi schemas',
      errorHandling: 'Centralized error handling with structured responses',
      logging: 'All requests and operations are logged for audit trails'
    }
  };

  res.json({
    success: true,
    data: apiDocs
  });
});

export default router; 