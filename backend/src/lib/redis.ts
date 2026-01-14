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
      /**
       * 테스트 환경/연결 시도 중에는 quit()이 대기하면서 Jest 종료를 막을 수 있습니다.
       * - ready 상태면 정상 종료(quit)
       * - 그 외(connecting/reconnecting 등)는 즉시 종료(disconnect) 우선
       */
      const client = RedisClient.instance;
      const status = (client as unknown as { status?: string }).status;

      if (typeof (client as unknown as { disconnect?: () => void }).disconnect === 'function') {
        if (status && status !== 'ready') {
          (client as unknown as { disconnect: () => void }).disconnect();
        } else {
          await client.quit();
        }
      } else {
        await client.quit();
      }
      RedisClient.instance = null;
      logger.info('Redis disconnected');
    }
  }
}

export default RedisClient.getInstance();
export { RedisClient };
