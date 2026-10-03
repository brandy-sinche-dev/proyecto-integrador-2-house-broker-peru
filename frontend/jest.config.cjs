/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  testTimeout: 20000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/jest.styleStub.cjs',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  testMatch: ['**/?(*.)+(test|spec).[jt]s?(x)'],
  collectCoverageFrom: [
    'src/components/properties/PropertyCard.tsx',
    'src/components/properties/PropertyDetail.tsx',
    'src/components/properties/Pagination.tsx',
    'src/components/properties/PropertyList.tsx',
    'src/services/properties.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}