import Joi from 'joi';

export class User {
  constructor(id, name, email, walletAddress, balance = 0, metadata = {}) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.walletAddress = walletAddress;
    this.balance = balance;
    this.metadata = metadata;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();

    this.validate();
  }

  static get validationSchema() {
    return Joi.object({
      id: Joi.string().required().min(1),
      name: Joi.string().required().min(2).max(100),
      email: Joi.string().email().required(),
      walletAddress: Joi.string().required().length(42),
      balance: Joi.number().min(0).default(0),
      metadata: Joi.object().default({}),
      createdAt: Joi.string().isoDate(),
      updatedAt: Joi.string().isoDate()
    });
  }

  validate() {
    const { error } = User.validationSchema.validate(this);
    if (error) {
      throw new Error(`User validation failed: ${error.details[0].message}`);
    }
  }

  updateBalance(amount) {
    if (typeof amount !== 'number') {
      throw new Error('Amount must be a number');
    }

    const newBalance = this.balance + amount;
    if (newBalance < 0) {
      throw new Error('Insufficient balance');
    }

    this.balance = newBalance;
    this.updatedAt = new Date().toISOString();
  }

  updateMetadata(newMetadata) {
    this.metadata = { ...this.metadata, ...newMetadata };
    this.updatedAt = new Date().toISOString();
  }

  async generateHash() {
    const crypto = await import('crypto');
    const userData = {
      id: this.id,
      name: this.name,
      email: this.email,
      walletAddress: this.walletAddress,
      balance: this.balance,
      metadata: this.metadata,
      createdAt: this.createdAt
    };

    return crypto.createHash('sha256')
      .update(JSON.stringify(userData))
      .digest('hex');
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      walletAddress: this.walletAddress,
      balance: this.balance,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      type: 'User'
    };
  }

  static fromJSON(json) {
    const user = new User(
      json.id,
      json.name,
      json.email,
      json.walletAddress,
      json.balance,
      json.metadata
    );

    if (json.createdAt) user.createdAt = json.createdAt;
    if (json.updatedAt) user.updatedAt = json.updatedAt;

    return user;
  }

  toString() {
    return `User(${this.id}): ${this.name} <${this.email}> [Balance: ${this.balance}]`;
  }
} 