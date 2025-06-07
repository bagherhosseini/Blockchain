process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

const originalConsole = { ...console };

beforeAll(() => {
  console.log = () => { };
  console.info = () => { };
  console.warn = () => { };
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

global.testUtils = {
  createTestAddress: () => {
    return '0x' + '1234567890abcdef'.repeat(2) + '12345678';
  },

  createTestUser: (id = 'test-user-1') => ({
    type: 'User',
    id,
    name: 'Test User',
    email: 'test@example.com',
    walletAddress: global.testUtils.createTestAddress(),
    balance: 1000,
    metadata: { test: true }
  }),

  createTestTransaction: (id = 'test-tx-1') => ({
    type: 'Transaction',
    id,
    fromAddress: '0x' + '1234567890abcdef'.repeat(2) + '12345678',
    toAddress: '0x' + 'fedcba0987654321'.repeat(2) + '87654321',
    amount: 100,
    transactionType: 'transfer',
    metadata: { test: true }
  }),

  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  createTempPath: (filename) => {
    return `./test-data-${Date.now()}-${filename}`;
  }
};