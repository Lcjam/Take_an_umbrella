import Redis from 'ioredis';
import { RedisClient } from '../../lib/redis';
import { logger } from '../../utils/logger';

type MockRedisInstance = {
  on: jest.Mock;
  quit: jest.Mock;
};

// logger 모킹
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// ioredis 모킹
jest.mock('ioredis');

describe('RedisClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 싱글톤 인스턴스 초기화
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (RedisClient as any).instance = null;
  });

  afterEach(async () => {
    await RedisClient.disconnect();
  });

  describe('getInstance', () => {
    test('Redis 인스턴스를 생성하고 반환해야 함', () => {
      const mockRedisInstance: MockRedisInstance = {
        on: jest.fn(),
        quit: jest.fn().mockResolvedValue('OK'),
      };

      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(
        () => mockRedisInstance as unknown as Redis
      );

      const instance = RedisClient.getInstance();

      expect(instance).toBe(mockRedisInstance);
      expect(Redis).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxRetriesPerRequest: 3,
          retryStrategy: expect.any(Function),
        })
      );
    });

    test('동일한 인스턴스를 재사용해야 함 (싱글톤)', () => {
      const mockRedisInstance: MockRedisInstance = {
        on: jest.fn(),
        quit: jest.fn().mockResolvedValue('OK'),
      };

      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(
        () => mockRedisInstance as unknown as Redis
      );

      const instance1 = RedisClient.getInstance();
      const instance2 = RedisClient.getInstance();

      expect(instance1).toBe(instance2);
      expect(Redis).toHaveBeenCalledTimes(1);
    });

    test('이벤트 리스너를 등록해야 함', () => {
      const mockOn = jest.fn();
      const mockRedisInstance: MockRedisInstance = {
        on: mockOn,
        quit: jest.fn().mockResolvedValue('OK'),
      };

      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(
        () => mockRedisInstance as unknown as Redis
      );

      RedisClient.getInstance();

      expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    test('Redis 생성 실패 시 명시적으로 에러를 던져야 함', () => {
      const mockError = new Error('Invalid Redis URL');

      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => {
        throw mockError;
      });

      expect(() => RedisClient.getInstance()).toThrow(
        'Redis initialization failed: Invalid Redis URL'
      );
      expect(logger.error).toHaveBeenCalledWith('Failed to create Redis instance', {
        error: 'Invalid Redis URL',
      });
    });

    test('Redis 생성 실패 후 인스턴스는 null이어야 함', () => {
      const mockError = new Error('Connection refused');

      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => {
        throw mockError;
      });

      try {
        RedisClient.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // 에러 무시
      }

      // 인스턴스가 null인지 확인
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((RedisClient as any).instance).toBeNull();
    });
  });

  describe('disconnect', () => {
    test('Redis 연결을 종료해야 함', async () => {
      const mockQuit = jest.fn().mockResolvedValue('OK');
      const mockRedisInstance: MockRedisInstance = {
        on: jest.fn(),
        quit: mockQuit,
      };

      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(
        () => mockRedisInstance as unknown as Redis
      );

      RedisClient.getInstance();
      await RedisClient.disconnect();

      expect(mockQuit).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Redis disconnected');
    });

    test('인스턴스가 없을 때 disconnect는 에러 없이 완료되어야 함', async () => {
      await expect(RedisClient.disconnect()).resolves.not.toThrow();
    });
  });
});
