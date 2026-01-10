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

  /**
   * PATCH /api/users/:user_id/location
   * 사용자 위치 정보를 설정/업데이트합니다
   */
  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user_id } = req.params;
      const { latitude, longitude, location_name } = req.body;

      // UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user_id)) {
        throw new AppError('VALIDATION_ERROR', 'Invalid user ID format');
      }

      // latitude와 longitude 필수 검증
      if (latitude === undefined || latitude === null) {
        throw new AppError('VALIDATION_ERROR', 'latitude is required');
      }

      if (longitude === undefined || longitude === null) {
        throw new AppError('VALIDATION_ERROR', 'longitude is required');
      }

      // 숫자 변환 및 검증
      const lat = Number(latitude);
      const lon = Number(longitude);

      if (isNaN(lat) || isNaN(lon)) {
        throw new AppError('VALIDATION_ERROR', 'latitude and longitude must be numbers');
      }

      // 범위 검증 (위도: -90 ~ 90, 경도: -180 ~ 180)
      if (lat < -90 || lat > 90) {
        throw new AppError('VALIDATION_ERROR', 'latitude must be between -90 and 90');
      }

      if (lon < -180 || lon > 180) {
        throw new AppError('VALIDATION_ERROR', 'longitude must be between -180 and 180');
      }

      const updatedSettings = await userService.updateUserLocation(user_id, {
        latitude: lat,
        longitude: lon,
        locationName: location_name || null,
      });

      res.status(200).json({
        success: true,
        data: {
          location_latitude: updatedSettings.locationLatitude?.toString() ?? null,
          location_longitude: updatedSettings.locationLongitude?.toString() ?? null,
          location_name: updatedSettings.locationName,
        },
        message: 'Location updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/:user_id/notification-time
   * 사용자 알림 시간을 설정/업데이트합니다
   */
  async updateNotificationTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user_id } = req.params;
      const { departure_time, notification_time } = req.body;

      // UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user_id)) {
        throw new AppError('VALIDATION_ERROR', 'Invalid user ID format');
      }

      // 최소 하나의 필드는 제공되어야 함
      if (departure_time === undefined && notification_time === undefined) {
        throw new AppError('VALIDATION_ERROR', 'At least one time field is required');
      }

      // 시간 형식 검증 (HH:mm:ss)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;

      if (departure_time !== undefined) {
        if (!timeRegex.test(departure_time)) {
          throw new AppError(
            'VALIDATION_ERROR',
            'Invalid time format for departure_time (expected HH:mm:ss)'
          );
        }
      }

      if (notification_time !== undefined) {
        if (!timeRegex.test(notification_time)) {
          throw new AppError(
            'VALIDATION_ERROR',
            'Invalid time format for notification_time (expected HH:mm:ss)'
          );
        }
      }

      // 두 값이 모두 제공된 경우 notification_time이 departure_time보다 이전인지 확인
      if (departure_time !== undefined && notification_time !== undefined) {
        const [dHour, dMin, dSec] = departure_time.split(':').map(Number);
        const [nHour, nMin, nSec] = notification_time.split(':').map(Number);

        const dTotalSeconds = dHour * 3600 + dMin * 60 + dSec;
        const nTotalSeconds = nHour * 3600 + nMin * 60 + nSec;

        if (nTotalSeconds >= dTotalSeconds) {
          throw new AppError('VALIDATION_ERROR', 'notification_time must be before departure_time');
        }
      }

      const updatedSettings = await userService.updateNotificationTime(user_id, {
        departureTime: departure_time,
        notificationTime: notification_time,
      });

      res.status(200).json({
        success: true,
        data: {
          user_id: updatedSettings.userId,
          departure_time: updatedSettings.departureTime,
          notification_time: updatedSettings.notificationTime,
        },
        message: 'Notification time updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
