module.exports = {
  transform: {
    '^.+\\.tsx?$': '/Users/shin-yeji/okrservice/node_modules/ts-jest',
  },
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^../connectionResolver$': '<rootDir>/src/__mocks__/connectionResolver.ts',
    '^../utils$': '<rootDir>/src/__mocks__/utils.ts',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
      },
    },
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
}
