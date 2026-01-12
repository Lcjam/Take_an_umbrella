import redis from '../lib/redis';
import { logger } from './logger';

/**
 * Redis 기반 캐싱 서비스
 * 날씨 데이터 및 기타 데이터를 캐싱하여 API 호출 횟수를 줄입니다.
 */
export class CacheService {
  /**
   * 캐시에 값을 저장합니다.
   * @param key - 캐시 키
   * @param value - 저장할 값 (객체, 문자열, 숫자 등)
   * @param ttl - TTL (Time To Live) in seconds
   */
  async set(key: string, value: unknown, ttl: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await redis.setex(key, ttl, serializedValue);
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`Cache set error: ${key}`, { error });
      throw error;
    }
  }

  /**
   * 캐시에서 값을 가져옵니다.
   * @param key - 캐시 키
   * @returns 캐시된 값 또는 null
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);

      if (value === null) {
        logger.debug(`Cache miss: ${key}`);
        return null;
      }

      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache get error: ${key}`, { error });
      throw error;
    }
  }

  /**
   * 캐시에서 값을 삭제합니다.
   * @param key - 캐시 키
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error(`Cache delete error: ${key}`, { error });
      throw error;
    }
  }

  /**
   * 캐시에 키가 존재하는지 확인합니다.
   * @param key - 캐시 키
   * @returns 존재 여부
   */
  async has(key: string): Promise<boolean> {
    try {
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Cache has error: ${key}`, { error });
      throw error;
    }
  }

  /**
   * 캐시 키를 생성합니다.
   * prefix와 params를 조합하여 일관된 키를 생성합니다.
   * 파라미터를 JSON.stringify하여 키 충돌을 방지합니다.
   * @param prefix - 키 접두사 (예: 'weather', 'user')
   * @param params - 키 파라미터 (객체)
   * @returns 생성된 캐시 키
   */
  generateKey(prefix: string, params: Record<string, unknown>): string {
    // params를 키로 정렬한 후 JSON.stringify
    // 이렇게 하면 값에 구분자(:)가 포함되어도 충돌이 발생하지 않음
    const sortedKeys = Object.keys(params).sort();
    const sortedParams: Record<string, unknown> = {};
    sortedKeys.forEach(key => {
      sortedParams[key] = params[key];
    });

    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }
}

// 싱글톤 인스턴스 export
export default new CacheService();
