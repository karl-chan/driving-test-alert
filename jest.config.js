module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  testEnvironment: 'node',
  moduleFileExtensions: [
    'ts',
    'js'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/dist/'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  testMatch: [
    '**/*.test.(ts|js)'
  ],
  setupFilesAfterEnv: [
    'jest-extended',
    'jest-chain'
  ]
}
