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
   */
  static getInstance(): Redis {
    if (!RedisClient.instance) {
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
