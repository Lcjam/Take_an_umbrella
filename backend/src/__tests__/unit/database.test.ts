import dotenv from 'dotenv';
import prisma from '../../lib/prisma';

// 환경 변수 로드
dotenv.config();

describe('Database Connection', () => {
  beforeAll(async () => {
    // 데이터베이스 연결 확인
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
  });

  afterAll(async () => {
    // 테스트 후 Prisma 연결 종료
    await prisma.$disconnect();
    // Pool 연결도 종료
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pool = (prisma as any).$adapter?.pool;
    if (pool) {
      await pool.end();
    }
  }, 10000); // 타임아웃 10초

  test('should connect to database successfully', async () => {
    // 데이터베이스 연결 테스트
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });

  test('should have all required tables', async () => {
    // 모든 테이블이 존재하는지 확인
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    const tableNames = tables.map((t: { tablename: string }) => t.tablename);

    // 필수 테이블 확인
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('user_settings');
    expect(tableNames).toContain('weather_data');
    expect(tableNames).toContain('notification_logs');
    expect(tableNames).toContain('feedbacks');
    expect(tableNames).toContain('user_ml_models');
    expect(tableNames).toContain('recommendation_rules');
  });
});
