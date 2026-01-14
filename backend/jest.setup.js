// Jest setup file - 환경 변수 로드
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

/**
 * Jest가 종료되지 않는 문제(오픈 핸들)를 방지하기 위해
 * 테스트 종료 시점에 DB/Redis 커넥션을 정리합니다.
 *
 * 주의: 일부 모듈(prisma/redis)은 import 시점에 커넥션을 생성할 수 있으므로,
 * teardown에서 확실히 닫아 Jest 프로세스가 정상 종료되도록 합니다.
 */
afterAll(async () => {
  try {
    // Prisma pool + client 정리
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { disconnectPrisma } = require('./src/lib/prisma');
    if (typeof disconnectPrisma === 'function') {
      await disconnectPrisma();
    }
  } catch (_e) {
    // ignore
  }

  try {
    // Redis 정리
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RedisClient } = require('./src/lib/redis');
    if (RedisClient?.disconnect) {
      await RedisClient.disconnect();
    }
  } catch (_e) {
    // ignore
  }
});

