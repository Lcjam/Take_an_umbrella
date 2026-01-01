import { Request, Response, NextFunction } from 'express';
import userService from '../services/user-service';
import { AppError } from '../types/errors';

class UserController {
  /**
   * POST /api/users
   * 사용자를 생성하거나 조회합니다
   */
  async createOrGetUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { device_id, anonymous_id } = req.body;

      // Validation
      if (!device_id || typeof device_id !== 'string' || device_id.trim() === '') {
        throw new AppError('VALIDATION_ERROR', 'device_id is required');
      }

      const { user, created } = await userService.createOrGetUser({
        deviceId: device_id,
        anonymousId: anonymous_id,
      });

      const statusCode = created ? 201 : 200;
      const message = created ? 'User created successfully' : 'User found';

      res.status(statusCode).json({
        success: true,
        data: {
          user_id: user.id,
          device_id: user.deviceId,
          created_at: user.createdAt.toISOString(),
          ...(user.lastActiveAt && {
            last_active_at: user.lastActiveAt.toISOString(),
          }),
        },
        message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:user_id
   * 사용자 정보를 조회합니다
   */
  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user_id } = req.params;

      // UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user_id)) {
        throw new AppError('VALIDATION_ERROR', 'Invalid user ID format');
      }

      const user = await userService.getUserById(user_id);

      if (!user) {
        throw new AppError('NOT_FOUND', 'User not found');
      }

      res.status(200).json({
        success: true,
        data: {
          user_id: user.id,
          device_id: user.deviceId,
          created_at: user.createdAt.toISOString(),
          ...(user.lastActiveAt && {
            last_active_at: user.lastActiveAt.toISOString(),
          }),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
