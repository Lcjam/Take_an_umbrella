import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// DATABASE_URL 확인 (환경 변수는 최상위 진입점에서 로드됨)
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// PostgreSQL 연결 풀 생성
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma Adapter 생성
const adapter = new PrismaPg(pool);

// PrismaClient 인스턴스 생성
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

/**
 * 테스트/프로세스 종료 시 Prisma 및 Pool을 정리합니다.
 * - PrismaClient.disconnect 만으로는 외부에서 만든 pg Pool이 남을 수 있어 pool.end()도 함께 호출합니다.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}

// 애플리케이션 종료 시 Prisma 연결 종료
process.on('beforeExit', async () => {
  await disconnectPrisma();
});

export default prisma;
