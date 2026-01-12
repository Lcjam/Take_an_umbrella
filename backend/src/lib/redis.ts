import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Redis 클라이언트 싱글톤
 * 애플리케이션 전체에서 하나의 Redis 연결을 공유합니다.
 */
class RedisClient {
  private static instance: Redis | null = null;

  /**
   * Redis 클라이언트 인스턴스를 반환합니다.
   * 처음 호출 시 연결을 생성하고, 이후에는 기존 연결을 재사용합니다.
   * @throws Error Redis 인스턴스 생성 실패 시
   */
  static getInstance(): Redis {
    if (!RedisClient.instance) {
      try {
        RedisClient.instance = new Redis(config.redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });

        RedisClient.instance.on('connect', () => {
          logger.info('Redis connected successfully');
        });

        RedisClient.instance.on('error', (err: Error) => {
          logger.error('Redis connection error', { error: err.message });
        });

        RedisClient.instance.on('ready', () => {
          logger.info('Redis ready to accept commands');
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error during Redis initialization';
        logger.error('Failed to create Redis instance', { error: errorMessage });
        throw new Error(`Redis initialization failed: ${errorMessage}`);
      }
    }

    // 타입 안전성 보장: instance가 null이면 에러 (위의 try-catch에서 처리되지 않은 경우)
    if (!RedisClient.instance) {
      throw new Error('Redis instance is null after initialization attempt');
    }

    return RedisClient.instance;
  }

  /**
   * Redis 연결을 종료합니다.
   * 테스트 환경에서 사용됩니다.
   */
  static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit();
      RedisClient.instance = null;
      logger.info('Redis disconnected');
    }
  }
}

export default RedisClient.getInstance();
export { RedisClient };
