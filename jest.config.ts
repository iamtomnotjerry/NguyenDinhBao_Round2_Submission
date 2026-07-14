import type { Config } from 'jest';
import nextJest from 'next/jest.js';

// next/jest wires SWC transform, tsconfig paths (@/*) and .env* loading
const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  // SWC rewrites `import '@/x'` but not `jest.mock('@/x')` — map explicitly
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  setupFiles: ['<rootDir>/jest.env.ts'],
  // Integration suites talk to Supabase Cloud — allow network latency
  testTimeout: 30_000,
};

export default createJestConfig(config);
