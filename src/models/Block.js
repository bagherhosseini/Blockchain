import crypto from 'crypto';
import Joi from 'joi';

export class Block {
  constructor(index, data, previousHash = '', difficulty = 4) {
    this.index = index;
    this.timestamp = new Date().toISOString();
    this.data = data;
    this.previousHash = previousHash;
    this.difficulty = difficulty;
    this.nonce = 0;
    this.hash = this.calculateHash();
    this.isValid = false;

    this.validate();
  }

  static get validationSchema() {
    return Joi.object({
      index: Joi.number().integer().min(0).required(),
      timestamp: Joi.string().isoDate().required(),
      data: Joi.array().items(Joi.object()).required(),
      previousHash: Joi.string().required(),
      difficulty: Joi.number().integer().min(1).max(10).default(4),
      nonce: Joi.number().integer().min(0).default(0),
      hash: Joi.string().required(),
      isValid: Joi.boolean().default(false)
    });
  }

  validate() {
    if (!Array.isArray(this.data)) {
      throw new Error('Block data must be an array');
    }

    if (this.data.length === 0) {
      throw new Error('Complex objects must have type and id properties');
    }

    const { error } = Block.validationSchema.validate(this);
    if (error) {
      throw new Error(`Block validation failed: ${error.details[0].message}`);
    }

    for (const item of this.data) {
      if (typeof item !== 'object' || item === null) {
        throw new Error('Block data must contain complex objects');
      }

      if (!item.type || !item.id) {
        throw new Error('Complex objects must have type and id properties');
      }
    }
  }

  calculateHash() {
    const blockData = {
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
      nonce: this.nonce
    };

    return crypto.createHash('sha256')
      .update(JSON.stringify(blockData))
      .digest('hex');
  }

  async mineBlock() {
    const target = Array(this.difficulty + 1).join('0');
    const startTime = Date.now();

    console.log(`Mining block ${this.index} with difficulty ${this.difficulty}...`);

    while (this.hash.substring(0, this.difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();

      if (this.nonce % 100000 === 0) {
        console.log(`Mining attempt ${this.nonce}: ${this.hash}`);
      }
    }

    const endTime = Date.now();
    const miningTime = (endTime - startTime) / 1000;

    this.isValid = true;
    console.log(`Block ${this.index} mined successfully!`);
    console.log(`Hash: ${this.hash}`);
    console.log(`Nonce: ${this.nonce}`);
    console.log(`Mining time: ${miningTime}s`);

    return this.hash;
  }

  verifyProofOfWork() {
    const target = Array(this.difficulty + 1).join('0');
    const calculatedHash = this.calculateHash();

    const hasValidHash = calculatedHash.substring(0, this.difficulty) === target;

    const hasCorrectHash = this.hash === calculatedHash;

    return hasValidHash && hasCorrectHash;
  }

  verifyIntegrity() {
    try {
      this.validate();

      if (!this.verifyProofOfWork()) {
        return false;
      }

      const blockTime = new Date(this.timestamp).getTime();
      const now = Date.now();
      if (blockTime > now + 60000) {
        return false;
      }

      for (const item of this.data) {
        if (!item.type || !item.id) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`Block integrity check failed: ${error.message}`);
      return false;
    }
  }

  addData(complexObject) {
    if (!complexObject || typeof complexObject !== 'object') {
      throw new Error('Data must be a complex object');
    }

    if (!complexObject.type || !complexObject.id) {
      throw new Error('Complex object must have type and id properties');
    }

    this.data.push(complexObject);

    this.hash = this.calculateHash();
    this.isValid = false;
  }

  getDataByType(type) {
    return this.data.filter(item => item.type === type);
  }

  getDataById(id) {
    return this.data.find(item => item.id === id) || null;
  }

  calculateSize() {
    const blockData = {
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
      difficulty: this.difficulty,
      nonce: this.nonce,
      hash: this.hash,
      isValid: this.isValid,
      dataCount: this.data.length
    };

    return Buffer.byteLength(JSON.stringify(blockData), 'utf8');
  }

  getMiningStats() {
    return {
      difficulty: this.difficulty,
      nonce: this.nonce,
      hash: this.hash,
      isValid: this.isValid,
      size: this.calculateSize(),
      dataCount: this.data.length,
      proofOfWorkValid: this.verifyProofOfWork()
    };
  }

  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
      difficulty: this.difficulty,
      nonce: this.nonce,
      hash: this.hash,
      isValid: this.isValid,
      size: this.calculateSize(),
      dataCount: this.data.length
    };
  }

  static fromJSON(json) {
    const block = new Block(
      json.index,
      json.data || [],
      json.previousHash || '',
      json.difficulty || 4
    );

    if (json.timestamp) block.timestamp = json.timestamp;
    if (json.nonce) block.nonce = json.nonce;
    if (json.hash) block.hash = json.hash;
    if (json.isValid !== undefined) block.isValid = json.isValid;

    return block;
  }

  toString() {
    return `Block ${this.index} [${this.data.length} items] - Hash: ${this.hash.substring(0, 10)}... (${this.isValid ? 'Valid' : 'Invalid'})`;
  }
} 