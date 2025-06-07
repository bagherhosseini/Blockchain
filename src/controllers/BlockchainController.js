import { BlockchainService } from '../services/BlockchainService.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { asyncHandler, ErrorFactory, handleBlockchainOperation } from '../middleware/errorHandler.js';
import Joi from 'joi';

export class BlockchainController {
  constructor() {
    this.blockchainService = new BlockchainService();
    this.initializeBlockchain();
  }

  async initializeBlockchain() {
    try {
      await this.blockchainService.initializeBlockchain();
    } catch (error) {
      throw error;
    }
  }

  static get validationSchemas() {
    return {
      createBlock: Joi.object({
        data: Joi.array().items(
          Joi.object({
            type: Joi.string().required().valid('User', 'Transaction'),
            id: Joi.string().required(),
            name: Joi.when('type', { is: 'User', then: Joi.string().required() }),
            email: Joi.when('type', { is: 'User', then: Joi.string().email().required() }),
            walletAddress: Joi.when('type', { is: 'User', then: Joi.string().length(42).required() }),
            balance: Joi.when('type', { is: 'User', then: Joi.number().min(0).default(0) }),
            metadata: Joi.object().default({}),
            fromAddress: Joi.when('type', { is: 'Transaction', then: Joi.string().length(42).required() }),
            toAddress: Joi.when('type', { is: 'Transaction', then: Joi.string().length(42).required() }),
            amount: Joi.when('type', { is: 'Transaction', then: Joi.number().positive().required() }),
            transactionType: Joi.when('type', { is: 'Transaction', then: Joi.string().valid('transfer', 'reward', 'fee').default('transfer') })
          })
        ).min(1).required()
      }),

      getBlocksByType: Joi.object({
        type: Joi.string().required().valid('User', 'Transaction')
      }),

      findObject: Joi.object({
        id: Joi.string().required().min(1)
      })
    };
  }

  createBlock = asyncHandler(async (req, res) => {
    const startTime = Date.now();

    const { error, value } = BlockchainController.validationSchemas.createBlock.validate(req.body);
    if (error) {
      throw ErrorFactory.invalidBlockData(error.details[0].message);
    }

    const { data } = value;

    const complexObjects = await handleBlockchainOperation(async () => {
      return this.processAndValidateComplexObjects(data);
    }, { operation: 'process_complex_objects' });

    const newBlock = await handleBlockchainOperation(async () => {
      return await this.blockchainService.createBlock(complexObjects);
    }, { operation: 'create_block' });

    const duration = Date.now() - startTime;

    res.status(201).json({
      success: true,
      message: 'Block created successfully',
      data: {
        block: {
          ...newBlock.toJSON(),
          miningStats: newBlock.getMiningStats()
        },
        miningTime: `${duration}ms`,
        performance: {
          hashRate: Math.round(newBlock.nonce / (duration / 1000)),
          difficulty: newBlock.difficulty
        }
      }
    });
  });

  getAllBlocks = asyncHandler(async (req, res) => {
    const blocks = await handleBlockchainOperation(async () => {
      return this.blockchainService.getAllBlocks();
    }, { operation: 'get_all_blocks' });

    const stats = this.blockchainService.getBlockchainStats();

    res.json({
      success: true,
      message: 'Blocks retrieved successfully',
      data: {
        blocks,
        statistics: stats,
        meta: {
          totalBlocks: blocks.length,
          timestamp: new Date().toISOString()
        }
      }
    });
  });

  getBlockByIndex = asyncHandler(async (req, res) => {
    const index = parseInt(req.params.index);

    if (isNaN(index) || index < 0) {
      throw ErrorFactory.invalidBlockData('Block index must be a non-negative integer');
    }

    const block = await handleBlockchainOperation(async () => {
      const foundBlock = this.blockchainService.getBlockByIndex(index);
      if (!foundBlock) {
        throw ErrorFactory.blockNotFound(index);
      }
      return foundBlock;
    }, { operation: 'get_block_by_index' });

    res.json({
      success: true,
      message: 'Block retrieved successfully',
      data: {
        block: {
          ...block.toJSON(),
          miningStats: block.getMiningStats()
        }
      }
    });
  });

  getBlocksByObjectType = asyncHandler(async (req, res) => {
    const { error, value } = BlockchainController.validationSchemas.getBlocksByType.validate(req.params);
    if (error) {
      throw ErrorFactory.invalidBlockData(error.details[0].message);
    }

    const { type } = value;

    const blocks = await handleBlockchainOperation(async () => {
      return this.blockchainService.getBlocksByObjectType(type);
    }, { operation: 'get_blocks_by_type' });

    res.json({
      success: true,
      message: `Blocks containing ${type} objects retrieved successfully`,
      data: {
        blocks: blocks.map(block => ({
          ...block.toJSON(),
          miningStats: block.getMiningStats(),
          relevantObjects: block.getDataByType(type)
        })),
        meta: {
          objectType: type,
          blocksFound: blocks.length,
          timestamp: new Date().toISOString()
        }
      }
    });
  });

  findObjectById = asyncHandler(async (req, res) => {
    const { error, value } = BlockchainController.validationSchemas.findObject.validate(req.params);
    if (error) {
      throw ErrorFactory.invalidBlockData(error.details[0].message);
    }

    const { id } = value;

    const result = await handleBlockchainOperation(async () => {
      const found = this.blockchainService.findObjectById(id);
      if (!found) {
        throw ErrorFactory.complexObjectInvalid('unknown', id);
      }
      return found;
    }, { operation: 'find_object_by_id' });

    res.json({
      success: true,
      message: 'Object found successfully',
      data: {
        object: result.object,
        location: {
          blockIndex: result.blockIndex,
          blockHash: result.blockHash
        }
      }
    });
  });

  getBlockchainStats = asyncHandler(async (req, res) => {
    const stats = await handleBlockchainOperation(async () => {
      return this.blockchainService.getBlockchainStats();
    }, { operation: 'get_blockchain_stats' });

    const runtimeStats = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Blockchain statistics retrieved successfully',
      data: {
        blockchain: stats,
        runtime: runtimeStats
      }
    });
  });

  validateBlockchain = asyncHandler(async (req, res) => {
    const startTime = Date.now();

    const isValid = await handleBlockchainOperation(async () => {
      return this.blockchainService.isChainValid();
    }, { operation: 'validate_blockchain' });

    const validationTime = Date.now() - startTime;

    res.json({
      success: true,
      message: 'Blockchain validation completed',
      data: {
        isValid,
        validationTime: `${validationTime}ms`,
        totalBlocks: this.blockchainService.chain.length,
        timestamp: new Date().toISOString()
      }
    });
  });

  createBackup = asyncHandler(async (req, res) => {
    const backupPath = await handleBlockchainOperation(async () => {
      return await this.blockchainService.createBackup();
    }, { operation: 'create_backup' });

    res.json({
      success: true,
      message: 'Blockchain backup created successfully',
      data: {
        backupPath,
        timestamp: new Date().toISOString()
      }
    });
  });

  async processAndValidateComplexObjects(data) {
    const complexObjects = [];

    for (const item of data) {
      try {
        let complexObject;

        switch (item.type) {
          case 'User':
            complexObject = new User(
              item.id,
              item.name,
              item.email,
              item.walletAddress,
              item.balance || 0,
              item.metadata || {}
            );
            break;

          case 'Transaction':
            complexObject = new Transaction(
              item.id,
              item.fromAddress,
              item.toAddress,
              item.amount,
              item.transactionType || 'transfer',
              item.metadata || {}
            );
            break;

          default:
            throw new Error(`Unsupported complex object type: ${item.type}`);
        }

        complexObjects.push(complexObject.toJSON());
      } catch (error) {
        throw ErrorFactory.complexObjectInvalid(item.type, item.id);
      }
    }

    return complexObjects;
  }
}

export default BlockchainController; 