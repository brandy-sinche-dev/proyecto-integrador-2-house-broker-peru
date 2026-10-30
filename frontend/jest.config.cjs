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
    '^.+\\.(js|jsx|mjs|cjs|ts|tsx)$': 'babel-jest',
  },
  // MSW se publica como ESM; Jest (CommonJS) necesita compilarlo junto con
  // sus dependencias ESM para poder usar `setupServer` en las pruebas.
  transformIgnorePatterns: [
    '/node_modules/(?!.*(?:msw|@mswjs|@msw/url|@open-draft|headers-polyfill|outvariant|until-async|is-node-process|rettime|tough-cookie|cookie))',
  ],
  testMatch: ['**/?(*.)+(test|spec).[jt]s?(x)'],
  collectCoverageFrom: [
    'src/components/properties/PropertyCard.tsx',
    'src/components/properties/FavoriteButton.tsx',
    'src/components/auth/LoginPrompt.tsx',
    'src/components/properties/PropertyDetail.tsx',
    'src/components/properties/Pagination.tsx',
    'src/components/properties/PropertyList.tsx',
    'src/components/properties/FilterSidebar.tsx',
    'src/components/properties/useFilterParams.ts',
    'src/components/properties/filters.ts',
    'src/hooks/useDebounce.ts',
    'src/services/properties.ts',
    'src/services/favorites.ts',
    'src/services/availability.ts',
    'src/services/appointments.ts',
    'src/services/session.ts',
    'src/components/availability/AvailabilityPanel.tsx',
    'src/components/availability/PropertyStatusSelector.tsx',
    'src/components/availability/ScheduleManager.tsx',
    'src/components/crm/DateSlotsPicker.tsx',
    'src/components/crm/AppointmentModal.tsx',
    'src/components/crm/SuccessToast.tsx',
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
