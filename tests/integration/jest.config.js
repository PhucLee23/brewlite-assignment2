// Integration test API (API-Txx) chạy trên PostgreSQL thật, CSDL riêng `brewlite_test`.
// Chạy từ apps/api: `npm run test:int`.
const path = require('path');

const apiDir = path.join(__dirname, '../../apps/api');

module.exports = {
  rootDir: __dirname,
  testRegex: '.*[.]int-spec[.]ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+[.]ts$': [
      require.resolve('ts-jest', { paths: [apiDir] }),
      { tsconfig: path.join(apiDir, 'tsconfig.json'), diagnostics: false },
    ],
  },
  // Thư viện (NestJS, Prisma, supertest) nằm trong apps/api/node_modules
  modulePaths: [path.join(apiDir, 'node_modules')],
  testEnvironment: 'node',
  globalSetup: '<rootDir>/support/global-setup.ts',
  setupFiles: ['<rootDir>/support/setup-env.ts'],
  testTimeout: 30000,
};
