import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// DATABASE_URL 확인 (환경 변수는 최상위 진입점에서 로드됨)
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// PostgreSQL 연결 풀 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prisma Adapter 생성
const adapter = new PrismaPg(pool);

// PrismaClient 인스턴스 생성
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// 애플리케이션 종료 시 Prisma 연결 종료
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;

