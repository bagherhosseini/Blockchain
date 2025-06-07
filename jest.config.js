export default {
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {},

  testEnvironment: 'node',

  testMatch: [
    '**/src/tests/**/*.test.js',
    '**/src/tests/**/*.spec.js'
  ],

  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],

  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],

  testTimeout: 30000,

  moduleFileExtensions: ['js', 'json'],

  verbose: true,

  clearMocks: true,

  errorOnDeprecated: true,

  forceExit: true,

  detectOpenHandles: true
}; 