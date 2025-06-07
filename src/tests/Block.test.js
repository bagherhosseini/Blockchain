import { Block } from '../models/Block.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';

describe('Block Model - TDD Tests', () => {
  let testComplexObjects;
  let testUser;
  let testTransaction;

  beforeEach(() => {
    testUser = new User(
      'user-1',
      'Test User',
      'test@example.com',
      global.testUtils.createTestAddress(),
      1000,
      { role: 'test' }
    );

    testTransaction = new Transaction(
      'tx-1',
      '0x1234567890abcdef1234567890abcdef12345678',
      '0xfedcba0987654321fedcba0987654321fedcba09',
      100,
      'transfer',
      { purpose: 'test' }
    );

    testComplexObjects = [
      testUser.toJSON(),
      testTransaction.toJSON()
    ];
  });

  describe('Block Creation', () => {
    test('should create a valid block with complex objects', () => {
      const block = new Block(1, testComplexObjects, 'previous-hash', 2);

      expect(block.index).toBe(1);
      expect(block.data).toEqual(testComplexObjects);
      expect(block.previousHash).toBe('previous-hash');
      expect(block.difficulty).toBe(2);
      expect(block.nonce).toBe(0);
      expect(block.isValid).toBe(false);
      expect(block.timestamp).toBeDefined();
      expect(block.hash).toBeDefined();
    });

    test('should validate complex objects in block data', () => {
      const block = new Block(1, testComplexObjects, 'previous-hash');

      expect(block.data).toHaveLength(2);
      expect(block.data[0].type).toBe('User');
      expect(block.data[1].type).toBe('Transaction');
      expect(block.data[0].id).toBe('user-1');
      expect(block.data[1].id).toBe('tx-1');
    });

    test('should throw error for invalid block data', () => {
      const invalidData = [
        { invalid: 'object' },
        { type: 'User' }
      ];

      expect(() => {
        new Block(1, invalidData, 'previous-hash');
      }).toThrow('Complex objects must have type and id properties');
    });

    test('should throw error for non-array data', () => {
      expect(() => {
        new Block(1, 'invalid-data', 'previous-hash');
      }).toThrow('Block data must be an array');
    });

    test('should throw error for empty data array', () => {
      expect(() => {
        new Block(1, [], 'previous-hash');
      }).toThrow('Complex objects must have type and id properties');
    });
  });

  describe('Hash Calculation', () => {
    test('should calculate hash correctly', () => {
      const block = new Block(1, testComplexObjects, 'previous-hash');

      const calculatedHash = block.calculateHash();
      expect(calculatedHash).toBe(block.hash);
      expect(calculatedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should produce different hashes for different data', () => {
      const block1 = new Block(1, testComplexObjects, 'previous-hash');

      const differentObjects = [testUser.toJSON()];
      const block2 = new Block(1, differentObjects, 'previous-hash');

      expect(block1.hash).not.toBe(block2.hash);
    });

    test('should update hash when nonce changes', () => {
      const block = new Block(1, testComplexObjects, 'previous-hash');
      const originalHash = block.hash;

      block.nonce = 12345;
      const newHash = block.calculateHash();

      expect(newHash).not.toBe(originalHash);
    });
  });

  describe('Proof of Work Mining', () => {
    test('should mine block with difficulty 1', async () => {
      const block = new Block(1, testComplexObjects, 'previous-hash', 1);

      const startTime = Date.now();
      const hash = await block.mineBlock();
      const endTime = Date.now();

      expect(hash).toBe(block.hash);
      expect(hash.substring(0, 1)).toBe('0');
      expect(block.isValid).toBe(true);
      expect(block.nonce).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(10000);
    });

    test('should mine block with difficulty 2', async () => {
      const block = new Block(1, testComplexObjects, 'previous-hash', 2);

      const hash = await block.mineBlock();

      expect(hash.substring(0, 2)).toBe('00');
      expect(block.isValid).toBe(true);
      expect(block.nonce).toBeGreaterThan(0);
    });

    test('should verify proof of work after mining', async () => {
      const block = new Block(1, testComplexObjects, 'previous-hash', 2);

      await block.mineBlock();

      expect(block.verifyProofOfWork()).toBe(true);
    });

    test('should invalidate proof of work when data changes', async () => {
      const block = new Block(1, testComplexObjects, 'previous-hash', 2);

      await block.mineBlock();
      expect(block.verifyProofOfWork()).toBe(true);

      block.data[0].balance = 9999;
      expect(block.verifyProofOfWork()).toBe(false);
    });
  });

  describe('Block Validation', () => {
    test('should validate block integrity', async () => {
      const block = new Block(1, testComplexObjects, 'previous-hash', 2);

      await block.mineBlock();

      expect(block.verifyIntegrity()).toBe(true);
    });

    test('should fail integrity check for unmined block', () => {
      const block = new Block(1, testComplexObjects, 'previous-hash', 2);

      expect(block.verifyIntegrity()).toBe(false);
    });

    test('should fail integrity check for future timestamp', () => {
      const block = new Block(1, testComplexObjects, 'previous-hash', 1);

      block.timestamp = new Date(Date.now() + 3600000).toISOString();

      expect(block.verifyIntegrity()).toBe(false);
    });

    test('should validate complex object types', () => {
      const block = new Block(1, testComplexObjects, 'previous-hash');

      const userObjects = block.getDataByType('User');
      const transactionObjects = block.getDataByType('Transaction');

      expect(userObjects).toHaveLength(1);
      expect(transactionObjects).toHaveLength(1);
      expect(userObjects[0].name).toBe('Test User');
      expect(transactionObjects[0].amount).toBe(100);
    });
  });

  describe('Block Data Management', () => {
    test('should add complex object to block', () => {
      const block = new Block(1, [testUser.toJSON()], 'previous-hash');

      expect(block.data).toHaveLength(1);

      block.addData(testTransaction.toJSON());

      expect(block.data).toHaveLength(2);
      expect(block.isValid).toBe(false);
    });

    test('should throw error when adding invalid object', () => {
      const block = new Block(1, testComplexObjects, 'previous-hash');

      expect(() => {
        block.addData({ invalid: 'object' });
      }).toThrow('Complex object must have type and id properties');
    });

    test('should find object by ID', () => {
      const block = new Block(1, testComplexObjects, 'previous-hash');

      const foundUser = block.getDataById('user-1');
      const foundTransaction = block.getDataById('tx-1');
      const notFound = block.getDataById('non-existent');

      expect(foundUser).toBeDefined();
      expect(foundUser.name).toBe('Test User');
      expect(foundTransaction).toBeDefined();
      expect(foundTransaction.amount).toBe(100);
      expect(notFound).toBeNull();
    });

    test('should calculate block size', () => {
      const block = new Block(1, testComplexObjects, 'previous-hash');

      const size = block.calculateSize();

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });
  });

  describe('Block Statistics', () => {
    test('should provide mining statistics', async () => {
      const block = new Block(1, testComplexObjects, 'previous-hash', 2);

      await block.mineBlock();

      const stats = block.getMiningStats();

      expect(stats).toHaveProperty('difficulty', 2);
      expect(stats).toHaveProperty('nonce');
      expect(stats).toHaveProperty('hash');
      expect(stats).toHaveProperty('isValid', true);
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('dataCount', 2);
      expect(stats).toHaveProperty('proofOfWorkValid', true);
    });
  });

  describe('Block Serialization', () => {
    test('should serialize to JSON correctly', async () => {
      const block = new Block(1, testComplexObjects, 'previous-hash', 2);

      await block.mineBlock();

      const json = block.toJSON();

      expect(json).toHaveProperty('index', 1);
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('data', testComplexObjects);
      expect(json).toHaveProperty('previousHash', 'previous-hash');
      expect(json).toHaveProperty('difficulty', 2);
      expect(json).toHaveProperty('nonce');
      expect(json).toHaveProperty('hash');
      expect(json).toHaveProperty('isValid', true);
      expect(json).toHaveProperty('size');
      expect(json).toHaveProperty('dataCount', 2);
    });

    test('should deserialize from JSON correctly', async () => {
      const originalBlock = new Block(1, testComplexObjects, 'previous-hash', 2);
      await originalBlock.mineBlock();

      const json = originalBlock.toJSON();
      const restoredBlock = Block.fromJSON(json);

      expect(restoredBlock.index).toBe(originalBlock.index);
      expect(restoredBlock.timestamp).toBe(originalBlock.timestamp);
      expect(restoredBlock.data).toEqual(originalBlock.data);
      expect(restoredBlock.previousHash).toBe(originalBlock.previousHash);
      expect(restoredBlock.difficulty).toBe(originalBlock.difficulty);
      expect(restoredBlock.nonce).toBe(originalBlock.nonce);
      expect(restoredBlock.hash).toBe(originalBlock.hash);
      expect(restoredBlock.isValid).toBe(originalBlock.isValid);
    });
  });

  describe('Block String Representation', () => {
    test('should provide readable string representation', async () => {
      const block = new Block(1, testComplexObjects, 'previous-hash', 2);

      await block.mineBlock();

      const str = block.toString();

      expect(str).toContain('Block 1');
      expect(str).toContain('[2 items]');
      expect(str).toContain('Valid');
      expect(str).toContain(block.hash.substring(0, 10));
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle very high difficulty gracefully', () => {
      const block = new Block(1, testComplexObjects, 'previous-hash', 8);

      expect(block.difficulty).toBe(8);
      expect(block.isValid).toBe(false);
    });

    test('should handle empty metadata in complex objects', () => {
      const userWithoutMetadata = new User(
        'user-2',
        'User Two',
        'user2@example.com',
        global.testUtils.createTestAddress()
      );

      const block = new Block(1, [userWithoutMetadata.toJSON()], 'previous-hash');

      expect(block.data[0].metadata).toBeDefined();
    });

    test('should maintain hash consistency across multiple calculations', () => {
      const block = new Block(1, testComplexObjects, 'previous-hash');

      const hash1 = block.calculateHash();
      const hash2 = block.calculateHash();
      const hash3 = block.calculateHash();

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });
  });
}); 