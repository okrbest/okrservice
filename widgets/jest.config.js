/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          // client/utils.ts의 \p{Script=Hangul} 유니코드 정규식(/u 플래그)은
          // es6+ 타깃 필요. 프로덕션 빌드(ts-loader, transpileOnly)는 영향 없음 —
          // 테스트 컴파일(ts-jest)에서만 타깃을 올려 TS1501 컴파일 에러 방지.
          target: 'es6',
        },
      },
    ],
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
};
