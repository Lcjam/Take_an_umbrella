import { CacheService } from '../../utils/cache';
import { RedisClient } from '../../lib/redis';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeAll(async () => {
    cacheService = new CacheService();
  });

  afterAll(async () => {
    await RedisClient.disconnect();
  });

  beforeEach(async () => {
    // 테스트 전에 캐시 초기화
    const redis = RedisClient.getInstance();
    await redis.flushdb();
  });

  describe('set and get', () => {
    it('캐시에 값을 저장하고 가져올 수 있어야 함', async () => {
      const key = 'test:key';
      const value = { name: 'test', age: 30 };

      await cacheService.set(key, value, 60);
      const result = await cacheService.get(key);

      expect(result).toEqual(value);
    });

    it('문자열 값을 저장하고 가져올 수 있어야 함', async () => {
      const key = 'test:string';
      const value = 'hello world';

      await cacheService.set(key, value, 60);
      const result = await cacheService.get(key);

      expect(result).toBe(value);
    });

    it('숫자 값을 저장하고 가져올 수 있어야 함', async () => {
      const key = 'test:number';
      const value = 42;

      await cacheService.set(key, value, 60);
      const result = await cacheService.get(key);

      expect(result).toBe(value);
    });

    it('존재하지 않는 키는 null을 반환해야 함', async () => {
      const result = await cacheService.get('non:existent:key');
      expect(result).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('TTL이 만료되면 값이 삭제되어야 함', async () => {
      const key = 'test:ttl';
      const value = 'expires soon';

      await cacheService.set(key, value, 1); // 1초 TTL

      // 즉시 조회하면 값이 있어야 함
      const result1 = await cacheService.get(key);
      expect(result1).toBe(value);

      // 1.5초 대기
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 만료 후에는 null이어야 함
      const result2 = await cacheService.get(key);
      expect(result2).toBeNull();
    });
  });

  describe('delete', () => {
    it('캐시에서 값을 삭제할 수 있어야 함', async () => {
      const key = 'test:delete';
      const value = 'to be deleted';

      await cacheService.set(key, value, 60);
      await cacheService.delete(key);

      const result = await cacheService.get(key);
      expect(result).toBeNull();
    });

    it('존재하지 않는 키 삭제는 에러 없이 완료되어야 함', async () => {
      await expect(cacheService.delete('non:existent:key')).resolves.not.toThrow();
    });
  });

  describe('has', () => {
    it('존재하는 키는 true를 반환해야 함', async () => {
      const key = 'test:exists';
      const value = 'exists';

      await cacheService.set(key, value, 60);
      const exists = await cacheService.has(key);

      expect(exists).toBe(true);
    });

    it('존재하지 않는 키는 false를 반환해야 함', async () => {
      const exists = await cacheService.has('non:existent:key');
      expect(exists).toBe(false);
    });
  });

  describe('generateKey', () => {
    it('prefix와 params로 캐시 키를 생성해야 함', () => {
      const key1 = cacheService.generateKey('weather', { lat: 37.5, lon: 127 });
      expect(key1).toBe('weather:{"lat":37.5,"lon":127}');

      const key2 = cacheService.generateKey('user', { id: '123' });
      expect(key2).toBe('user:{"id":"123"}');
    });

    it('params의 순서가 달라도 같은 키를 생성해야 함', () => {
      const key1 = cacheService.generateKey('test', { a: '1', b: '2' });
      const key2 = cacheService.generateKey('test', { b: '2', a: '1' });

      expect(key1).toBe(key2);
    });

    it('구분자(:)가 포함된 값으로 인한 키 충돌을 방지해야 함', () => {
      const key1 = cacheService.generateKey('prefix', { a: '1:2', b: '3' });
      const key2 = cacheService.generateKey('prefix', { a: '1', b: '2:3' });

      // 현재 구현: key1 = 'prefix:1:2:3', key2 = 'prefix:1:2:3' (충돌!)
      expect(key1).not.toBe(key2); // 다른 파라미터는 다른 키를 생성해야 함
    });

    it('특수 문자가 포함된 값도 안전하게 처리해야 함', () => {
      const key1 = cacheService.generateKey('test', { lat: '37.5:127', lng: '0' });
      const key2 = cacheService.generateKey('test', { lat: '37.5', lng: '127:0' });

      expect(key1).not.toBe(key2);
    });
  });
});
