import fs from 'fs/promises';
import path from 'path';
import { Block } from '../models/Block.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';

export class BlockchainService {
  constructor(dataFilePath = './data/blockchain.json', difficulty = 4) {
    this.chain = [];
    this.dataFilePath = dataFilePath;
    this.difficulty = difficulty;
    this.pendingTransactions = [];
    this.miningReward = 10;

    this.initializeBlockchain();
  }

  async initializeBlockchain() {
    try {
      await this.loadFromFile();

      if (this.chain.length === 0) {
        await this.createGenesisBlock();
      }

      if (!this.isChainValid()) {
        throw new Error('Loaded blockchain is invalid');
      }

      console.log(`Blockchain initialized with ${this.chain.length} blocks`);
    } catch (error) {
      console.error('Failed to initialize blockchain:', error.message);

      this.chain = [];
      await this.createGenesisBlock();
    }
  }

  async createGenesisBlock() {
    console.log('Creating genesis block...');

    const genesisUser = new User(
      'genesis-user',
      'Genesis User',
      'genesis@blockchain.com',
      '0x0000000000000000000000000000000000000000',
      1000000,
      { isGenesis: true }
    );

    const genesisTransaction = new Transaction(
      'genesis-tx',
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      1000000,
      'genesis',
      { isGenesis: true }
    );

    const genesisData = [
      genesisUser.toJSON(),
      genesisTransaction.toJSON()
    ];

    const genesisBlock = new Block(0, genesisData, '0', this.difficulty);
    await genesisBlock.mineBlock();

    this.chain.push(genesisBlock);
    await this.saveToFile();

    console.log('Genesis block created successfully');
  }

  async createBlock(complexObjects) {
    if (!Array.isArray(complexObjects) || complexObjects.length === 0) {
      throw new Error('Block must contain at least one complex object');
    }

    for (const obj of complexObjects) {
      if (!obj || typeof obj !== 'object' || !obj.type || !obj.id) {
        throw new Error('All data items must be complex objects with type and id properties');
      }
    }

    const previousBlock = this.getLatestBlock();
    const newIndex = previousBlock.index + 1;

    console.log(`Creating block ${newIndex} with ${complexObjects.length} complex objects...`);

    const newBlock = new Block(
      newIndex,
      complexObjects,
      previousBlock.hash,
      this.difficulty
    );

    await newBlock.mineBlock();

    this.chain.push(newBlock);
    await this.saveToFile();

    console.log(`Block ${newIndex} added to blockchain`);
    return newBlock;
  }

  getLatestBlock() {
    if (this.chain.length === 0) {
      throw new Error('Blockchain is empty');
    }
    return this.chain[this.chain.length - 1];
  }

  getAllBlocks() {
    return this.chain.map(block => ({
      ...block.toJSON(),
      miningStats: block.getMiningStats()
    }));
  }

  getBlockByIndex(index) {
    if (index < 0 || index >= this.chain.length) {
      return null;
    }
    return this.chain[index];
  }

  getBlocksByObjectType(objectType) {
    return this.chain.filter(block =>
      block.getDataByType(objectType).length > 0
    );
  }

  findObjectById(objectId) {
    for (const block of this.chain) {
      const object = block.getDataById(objectId);
      if (object) {
        return {
          object,
          blockIndex: block.index,
          blockHash: block.hash
        };
      }
    }
    return null;
  }

  isChainValid() {
    try {
      for (let i = 1; i < this.chain.length; i++) {
        const currentBlock = this.chain[i];
        const previousBlock = this.chain[i - 1];

        if (!currentBlock.verifyIntegrity()) {
          console.error(`Block ${i} integrity check failed`);
          return false;
        }

        if (currentBlock.previousHash !== previousBlock.hash) {
          console.error(`Block ${i} previous hash mismatch`);
          return false;
        }

        if (!currentBlock.verifyProofOfWork()) {
          console.error(`Block ${i} proof of work invalid`);
          return false;
        }
      }

      if (this.chain.length > 0) {
        const genesisBlock = this.chain[0];
        if (genesisBlock.index !== 0 || genesisBlock.previousHash !== '0') {
          console.error('Genesis block is invalid');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Chain validation error:', error.message);
      return false;
    }
  }

  getBlockchainStats() {
    const totalBlocks = this.chain.length;
    let totalTransactions = 0;
    let totalUsers = 0;
    let totalSize = 0;

    for (const block of this.chain) {
      totalTransactions += block.getDataByType('Transaction').length;
      totalUsers += block.getDataByType('User').length;
      totalSize += block.calculateSize();
    }

    return {
      totalBlocks,
      totalTransactions,
      totalUsers,
      totalSize,
      averageBlockSize: totalBlocks > 0 ? Math.round(totalSize / totalBlocks) : 0,
      difficulty: this.difficulty,
      isValid: this.isChainValid(),
      latestBlockHash: totalBlocks > 0 ? this.getLatestBlock().hash : null
    };
  }

  async loadFromFile() {
    try {
      const dir = path.dirname(this.dataFilePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.access(this.dataFilePath);

      const data = await fs.readFile(this.dataFilePath, 'utf8');
      const chainData = JSON.parse(data);

      this.chain = chainData.map(blockData => Block.fromJSON(blockData));

      console.log(`Loaded ${this.chain.length} blocks from ${this.dataFilePath}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('Blockchain file not found, starting with empty chain');
      } else {
        console.error('Error loading blockchain:', error.message);
        throw error;
      }
    }
  }

  async saveToFile() {
    try {
      const dir = path.dirname(this.dataFilePath);
      await fs.mkdir(dir, { recursive: true });

      const chainData = this.chain.map(block => block.toJSON());

      await fs.writeFile(
        this.dataFilePath,
        JSON.stringify(chainData, null, 2),
        'utf8'
      );

      console.log(`Blockchain saved to ${this.dataFilePath}`);
    } catch (error) {
      console.error('Error saving blockchain:', error.message);
      throw error;
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = this.dataFilePath.replace('.json', `_backup_${timestamp}.json`);

    const chainData = this.chain.map(block => block.toJSON());
    await fs.writeFile(backupPath, JSON.stringify(chainData, null, 2), 'utf8');

    console.log(`Blockchain backup created: ${backupPath}`);
    return backupPath;
  }

  processComplexObjects(objects) {
    return objects.map(obj => {
      switch (obj.type) {
        case 'User':
          return User.fromJSON(obj).toJSON();
        case 'Transaction':
          return Transaction.fromJSON(obj).toJSON();
        default:
          if (!obj.type || !obj.id) {
            throw new Error('Complex objects must have type and id properties');
          }
          return obj;
      }
    });
  }

  async repairBlockchain() {
    let removedBlocks = 0;
    const validChain = [];

    for (let i = 0; i < this.chain.length; i++) {
      const block = this.chain[i];

      if (i === 0) {
        if (block.index === 0) {
          validChain.push(block);
        } else {
          removedBlocks++;
        }
      } else {
        const previousBlock = validChain[validChain.length - 1];
        if (block.verifyIntegrity() && block.previousHash === previousBlock.hash) {
          validChain.push(block);
        } else {
          removedBlocks++;
          console.warn(`Removed invalid block ${block.index}`);
        }
      }
    }

    this.chain = validChain;

    if (removedBlocks > 0) {
      await this.saveToFile();
      console.log(`Blockchain repaired: removed ${removedBlocks} invalid blocks`);
    }

    return removedBlocks;
  }
} 