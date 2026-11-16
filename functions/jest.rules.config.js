module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/rules-test'],
  testMatch: ['**/*.test.ts'],
  testTimeout: 20000,
};
