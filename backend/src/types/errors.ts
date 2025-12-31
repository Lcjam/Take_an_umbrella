/**
 * 커스텀 에러 클래스
 * API에서 발생하는 모든 에러를 일관되게 처리하기 위한 기본 클래스
 */

/**
 * 에러 응답 인터페이스
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * 에러 코드 타입
 */
export type ErrorCode =
  | 'VALIDATION_ERROR' // 400
  | 'UNAUTHORIZED' // 401
  | 'NOT_FOUND' // 404
  | 'CONFLICT' // 409
  | 'INTERNAL_ERROR' // 500
  | 'EXTERNAL_API_ERROR'; // 502

/**
 * HTTP 상태 코드 매핑
 */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  EXTERNAL_API_ERROR: 502,
};

/**
 * 기본 커스텀 에러 클래스
 * 모든 애플리케이션 에러는 이 클래스를 상속받음
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = ERROR_STATUS_MAP[code];
    this.details = details;

    // TypeScript의 프로토타입 체인 복원
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * 에러를 JSON 형식으로 변환
   */
  toJSON(): ErrorResponse {
    const errorObj: ErrorResponse = {
      success: false,
      error: {
        code: this.code,
        message: this.message,
      },
    };

    if (this.details !== undefined) {
      errorObj.error.details = this.details;
    }

    return errorObj;
  }
}

/**
 * 검증 에러 (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 인증 에러 (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super('UNAUTHORIZED', message, details);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 리소스 없음 에러 (404)
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super('NOT_FOUND', message, details);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 충돌 에러 (409)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super('CONFLICT', message, details);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 외부 API 에러 (502)
 */
export class ExternalApiError extends AppError {
  constructor(message = 'External API error', details?: unknown) {
    super('EXTERNAL_API_ERROR', message, details);
    this.name = 'ExternalApiError';
    Object.setPrototypeOf(this, ExternalApiError.prototype);
  }
}
