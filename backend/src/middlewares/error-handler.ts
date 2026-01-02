import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorResponse } from '../types/errors';
import { logger } from '../utils/logger';

/**
 * 에러 핸들링 미들웨어
 * 모든 에러를 일관된 형식으로 변환하여 응답
 *
 * @param error - 발생한 에러
 * @param req - Express Request 객체
 * @param res - Express Response 객체
 * @param next - Express NextFunction (사용되지 않지만 시그니처 유지 필요)
 */
export const errorHandler = (
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 에러 로깅 (개발/테스트 환경에서는 상세하게, 프로덕션에서는 간략하게)
  if (process.env.NODE_ENV !== 'production') {
    logger.error('Error occurred:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof AppError && { code: error.code }),
    });
  } else {
    logger.error('Error occurred:', { message: error.message });
  }

  // AppError인 경우 - 정의된 에러
  if (error instanceof AppError) {
    const response: ErrorResponse = error.toJSON();
    res.status(error.statusCode).json(response);
    return;
  }

  // 일반 Error인 경우 - 예상하지 못한 에러
  const statusCode = 500;
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      // 테스트 환경에서는 스택 트레이스 포함
      ...(process.env.NODE_ENV === 'test' && {
        details: { stack: error.stack },
      }),
    },
  };

  res.status(statusCode).json(response);
};
