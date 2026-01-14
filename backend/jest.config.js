module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // jest lifecycle hook(afterAll 등)를 쓰기 위해 afterEnv 단계에서 setup 실행
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    // 외부 인프라(Firebase Admin) 초기화/자격증명 의존 파일은 커버리지 측정에서 제외
    '!src/lib/firebase.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 85,
      statements: 85,
    },
  },
  // 일부 모듈이 import 시 커넥션을 열어 테스트가 종료되지 않는 경우가 있어 강제 종료
  forceExit: true,
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 30000, // 30초로 timeout 증가
};

