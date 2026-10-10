/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          rootDir: '.',
          strict: true,
          esModuleInterop: true,
          moduleResolution: 'bundler',
          module: 'esnext',
          types: ['jest'],
          ignoreDeprecations: '6.0',
        },
        diagnostics: {
          ignoreCodes: ['TS151001'],
        },
      },
    ],
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  passWithNoTests: true,
};

module.exports = config;
