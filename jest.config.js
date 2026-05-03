/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|scss|sass)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  modulePathIgnorePatterns: ['<rootDir>/.rollup.cache/', '<rootDir>/dist/'],
  testPathIgnorePatterns: ['<rootDir>/.rollup.cache/', '<rootDir>/dist/'],
};
