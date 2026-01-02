import winston from 'winston';
import { config } from '../config/env';

const LOG_LEVEL = config.nodeEnv === 'production' ? 'info' : 'debug';

// 로그 포맷 정의
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console 포맷 (개발 환경용 - 가독성 높음)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // 메타데이터가 있으면 추가
    const metaKeys = Object.keys(metadata);
    if (metaKeys.length > 0) {
      // timestamp와 level을 제외한 나머지 메타데이터만 출력
      const filteredMeta = Object.keys(metadata)
        .filter(key => !['timestamp', 'level', 'message'].includes(key))
        .reduce(
          (obj, key) => {
            obj[key] = metadata[key];
            return obj;
          },
          {} as Record<string, unknown>
        );

      if (Object.keys(filteredMeta).length > 0) {
        msg += ` ${JSON.stringify(filteredMeta, null, 2)}`;
      }
    }

    return msg;
  })
);

// 트랜스포트 설정
const transports: winston.transport[] = [];

// 개발 환경에서는 콘솔에만 출력
if (config.nodeEnv !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
} else {
  // 프로덕션 환경에서는 JSON 포맷으로 출력
  transports.push(
    new winston.transports.Console({
      format: logFormat,
    })
  );

  // 프로덕션에서는 파일에도 기록 (선택사항)
  // transports.push(
  //   new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  //   new winston.transports.File({ filename: 'logs/combined.log' })
  // );
}

// 로거 인스턴스 생성
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  transports,
  // 처리되지 않은 예외 처리
  exceptionHandlers: [
    new winston.transports.Console({
      format: config.nodeEnv !== 'production' ? consoleFormat : logFormat,
    }),
  ],
  // 처리되지 않은 Promise 거부 처리
  rejectionHandlers: [
    new winston.transports.Console({
      format: config.nodeEnv !== 'production' ? consoleFormat : logFormat,
    }),
  ],
});

// 테스트 환경에서는 로그 출력 최소화
if (config.nodeEnv === 'test') {
  logger.silent = true;
}
