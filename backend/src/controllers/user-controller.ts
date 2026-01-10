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

      // 논리적 검증은 서비스 레이어에서 수행 (최종 상태 기반)
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

  /**
   * POST /api/users/:user_id/fcm-token
   * FCM 토큰을 등록/갱신합니다
   */
  async registerFcmToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user_id } = req.params;
      const { fcm_token } = req.body;

      // FCM 토큰 검증
      if (!fcm_token || typeof fcm_token !== 'string' || fcm_token.trim() === '') {
        throw new AppError('VALIDATION_ERROR', 'fcm_token is required');
      }

      const updatedSettings = await userService.updateFcmToken(user_id, fcm_token.trim());

      res.status(200).json({
        success: true,
        data: {
          fcm_token: updatedSettings.fcmToken,
        },
        message: 'FCM token registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/users/:user_id/fcm-token
   * FCM 토큰을 삭제합니다
   */
  async deleteFcmToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user_id } = req.params;

      await userService.deleteFcmToken(user_id);

      res.status(200).json({
        success: true,
        message: 'FCM token deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/:user_id/notification-enabled
   * 알림 활성화/비활성화를 설정합니다
   */
  async updateNotificationEnabled(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user_id } = req.params;
      const { notification_enabled } = req.body;

      // notification_enabled 필수 검증
      if (notification_enabled === undefined || notification_enabled === null) {
        throw new AppError('VALIDATION_ERROR', 'notification_enabled is required');
      }

      // boolean 타입 검증
      if (typeof notification_enabled !== 'boolean') {
        throw new AppError('VALIDATION_ERROR', 'notification_enabled must be a boolean');
      }

      const updatedSettings = await userService.updateNotificationEnabled(
        user_id,
        notification_enabled
      );

      res.status(200).json({
        success: true,
        data: {
          notification_enabled: updatedSettings.notificationEnabled,
        },
        message: 'Notification setting updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
