import Joi from 'joi';
import crypto from 'crypto';

export class Transaction {
  constructor(id, fromAddress, toAddress, amount, transactionType = 'transfer', metadata = {}) {
    this.id = id;
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.transactionType = transactionType;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
    this.status = 'pending';
    this.hash = null;
    this.signature = null;

    this.validate();

    this.generateHash();
  }

  static get validationSchema() {
    return Joi.object({
      id: Joi.string().required().min(1),
      fromAddress: Joi.string().required().length(42),
      toAddress: Joi.string().required().length(42),
      amount: Joi.number().positive().required(),
      transactionType: Joi.string().valid('transfer', 'reward', 'fee', 'genesis').default('transfer'),
      metadata: Joi.object().default({}),
      timestamp: Joi.string().isoDate(),
      status: Joi.string().valid('pending', 'confirmed', 'failed').default('pending'),
      hash: Joi.string().allow(null),
      signature: Joi.string().allow(null)
    });
  }

  validate() {
    const { error } = Transaction.validationSchema.validate(this);
    if (error) {
      throw new Error(`Transaction validation failed: ${error.details[0].message}`);
    }

    if (this.fromAddress === this.toAddress && this.transactionType !== 'genesis') {
      throw new Error('From and to addresses cannot be the same');
    }

    if (this.amount <= 0) {
      throw new Error('Transaction amount must be positive');
    }
  }

  generateHash() {
    const transactionData = {
      id: this.id,
      fromAddress: this.fromAddress,
      toAddress: this.toAddress,
      amount: this.amount,
      transactionType: this.transactionType,
      metadata: this.metadata,
      timestamp: this.timestamp
    };

    this.hash = crypto.createHash('sha256')
      .update(JSON.stringify(transactionData))
      .digest('hex');

    return this.hash;
  }

  sign(privateKey) {
    if (!privateKey) {
      throw new Error('Private key is required for signing');
    }

    const sign = crypto.createSign('SHA256');
    sign.update(this.hash);
    this.signature = sign.sign(privateKey, 'hex');
  }

  verifySignature(publicKey) {
    if (!this.signature || !publicKey) {
      return false;
    }

    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(this.hash);
      return verify.verify(publicKey, this.signature, 'hex');
    } catch (error) {
      return false;
    }
  }

  confirm() {
    this.status = 'confirmed';
  }

  fail(reason) {
    this.status = 'failed';
    this.metadata.failureReason = reason;
  }

  isValid() {
    try {
      this.validate();
      return this.status === 'pending' && this.hash !== null;
    } catch {
      return false;
    }
  }

  calculateFee() {
    const baseFee = 0.001;
    const percentageFee = this.amount * 0.001;

    switch (this.transactionType) {
      case 'transfer':
        return baseFee + percentageFee;
      case 'reward':
        return 0;
      case 'fee':
        return 0;
      case 'genesis':
        return 0;
      default:
        return baseFee + percentageFee;
    }
  }

  toJSON() {
    return {
      id: this.id,
      fromAddress: this.fromAddress,
      toAddress: this.toAddress,
      amount: this.amount,
      transactionType: this.transactionType,
      metadata: this.metadata,
      timestamp: this.timestamp,
      status: this.status,
      hash: this.hash,
      signature: this.signature,
      fee: this.calculateFee(),
      type: 'Transaction'
    };
  }

  static fromJSON(json) {
    const transaction = new Transaction(
      json.id,
      json.fromAddress,
      json.toAddress,
      json.amount,
      json.transactionType,
      json.metadata
    );

    if (json.timestamp) transaction.timestamp = json.timestamp;
    if (json.status) transaction.status = json.status;
    if (json.hash) transaction.hash = json.hash;
    if (json.signature) transaction.signature = json.signature;

    return transaction;
  }

  toString() {
    return `Transaction(${this.id}): ${this.fromAddress} -> ${this.toAddress} [${this.amount} ${this.transactionType}] (${this.status})`;
  }
} 