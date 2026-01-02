import { logger } from '../../utils/logger';
import winston from 'winston';

describe('Logger Utility', () => {
  describe('Logger Instance', () => {
    test('로거 인스턴스가 정상적으로 생성되어야 함', () => {
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(winston.Logger);
    });

    test('로거는 error, warn, info, debug 메서드를 가져야 함', () => {
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Logging Levels', () => {
    test('error 레벨 로그를 기록할 수 있어야 함', () => {
      const errorMessage = 'Test error message';

      // 에러 발생 없이 호출 가능한지 확인
      expect(() => logger.error(errorMessage)).not.toThrow();
    });

    test('warn 레벨 로그를 기록할 수 있어야 함', () => {
      const warnMessage = 'Test warning message';

      expect(() => logger.warn(warnMessage)).not.toThrow();
    });

    test('info 레벨 로그를 기록할 수 있어야 함', () => {
      const infoMessage = 'Test info message';

      expect(() => logger.info(infoMessage)).not.toThrow();
    });

    test('debug 레벨 로그를 기록할 수 있어야 함', () => {
      const debugMessage = 'Test debug message';

      expect(() => logger.debug(debugMessage)).not.toThrow();
    });
  });

  describe('Metadata Logging', () => {
    test('메타데이터와 함께 로그를 기록할 수 있어야 함', () => {
      const message = 'Test message with metadata';
      const metadata = { userId: '123', action: 'login' };

      // 에러 발생 없이 호출 가능한지 확인
      expect(() => logger.info(message, metadata)).not.toThrow();
    });

    test('에러 객체와 함께 로그를 기록할 수 있어야 함', () => {
      const error = new Error('Test error');
      const message = 'Error occurred';

      // 에러 발생 없이 호출 가능한지 확인
      expect(() => logger.error(message, { error })).not.toThrow();
    });
  });

  describe('Environment Configuration', () => {
    test('로거는 환경 변수에 따라 로그 레벨을 설정해야 함', () => {
      // 테스트 환경에서는 로그 레벨이 설정되어 있어야 함
      expect(logger.level).toBeDefined();
    });
  });
});
