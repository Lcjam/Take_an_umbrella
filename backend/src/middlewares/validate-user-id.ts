import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors';

/**
 * user_id 파라미터의 UUID 유효성을 검증하는 미들웨어
 */
export const validateUserId = (req: Request, _res: Response, next: NextFunction): void => {
  const { user_id } = req.params;

  // UUID v4 형식 검증
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(user_id)) {
    throw new AppError('VALIDATION_ERROR', 'Invalid user ID format');
  }

  next();
};

