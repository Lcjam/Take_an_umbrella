/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotificationScheduler } from '../../services/notification-scheduler';
import { UserService } from '../../services/user-service';
import { WeatherService } from '../../services/weather-service';
import notificationService from '../../services/notification-service';
import { logger } from '../../utils/logger';
import * as cron from 'node-cron';

// Mock dependencies
jest.mock('../../services/user-service');
jest.mock('../../services/weather-service');
jest.mock('../../services/notification-service');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('node-cron');

describe('NotificationScheduler', () => {
  let scheduler: NotificationScheduler;
  let mockUserService: jest.Mocked<UserService>;
  let mockWeatherService: jest.Mocked<WeatherService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // UserService mock
    mockUserService = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    // WeatherService mock
    mockWeatherService = {
      getWeather: jest.fn(),
    } as unknown as jest.Mocked<WeatherService>;

    // node-cron mock
    (cron.schedule as jest.Mock) = jest.fn().mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    });

    scheduler = new NotificationScheduler(mockUserService, mockWeatherService);
  });

  describe('start', () => {
    it('스케줄러를 시작해야 함', () => {
      scheduler.start();

      expect(cron.schedule).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Notification scheduler started');
    });

    it('이미 시작된 스케줄러는 다시 시작하지 않아야 함', () => {
      scheduler.start();
      scheduler.start();

      expect(cron.schedule).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith('Scheduler is already running');
    });
  });

  describe('stop', () => {
    it('스케줄러를 중지해야 함', () => {
      const mockStop = jest.fn();
      (cron.schedule as jest.Mock).mockReturnValue({
        start: jest.fn(),
        stop: mockStop,
      });

      scheduler.start();
      scheduler.stop();

      expect(mockStop).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Notification scheduler stopped');
    });

    it('시작되지 않은 스케줄러는 중지할 수 없어야 함', () => {
      scheduler.stop();

      expect(logger.warn).toHaveBeenCalledWith('Scheduler is not running');
    });
  });

  describe('sendNotifications', () => {
    const mockUsers = [
      {
        id: 'user-1',
        deviceId: 'device-1',
        anonymousId: 'anon-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
        settings: {
          userId: 'user-1',
          locationLatitude: 37.5665,
          locationLongitude: 126.978,
          locationName: '서울',
          departureTime: '09:00',
          notificationTime: '08:30',
          fcmToken: 'token-1',
          notificationEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        id: 'user-2',
        deviceId: 'device-2',
        anonymousId: 'anon-2',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
        settings: {
          userId: 'user-2',
          locationLatitude: 35.1796,
          locationLongitude: 129.0756,
          locationName: '부산',
          departureTime: '08:00',
          notificationTime: '07:30',
          fcmToken: 'token-2',
          notificationEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ];

    const mockWeatherData = {
      temperature: 15,
      humidity: 70,
      precipitationProbability: 80,
      precipitation: 5,
      windSpeed: 3,
      skyCondition: '흐림',
      precipitationType: '비',
      forecastDate: '2026-01-13',
      forecastTime: '0800',
    };

    it('알림이 활성화된 사용자에게 날씨 알림을 전송해야 함', async () => {
      mockUserService.findAll.mockResolvedValue(mockUsers as any);
      mockWeatherService.getWeather.mockResolvedValue(mockWeatherData);
      (notificationService.sendWeatherNotification as jest.Mock).mockResolvedValue({
        success: true,
      });

      await scheduler.sendNotifications();

      expect(mockUserService.findAll).toHaveBeenCalled();
      expect(mockWeatherService.getWeather).toHaveBeenCalledTimes(2);
      expect(notificationService.sendWeatherNotification).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith('Notifications sent successfully', {
        total: 2,
        success: 2,
        failed: 0,
      });
    });

    it('알림이 비활성화된 사용자는 건너뛰어야 함', async () => {
      const disabledUser = {
        ...mockUsers[0],
        settings: {
          ...mockUsers[0].settings!,
          notificationEnabled: false,
        },
      };

      mockUserService.findAll.mockResolvedValue([disabledUser, mockUsers[1]] as any);
      mockWeatherService.getWeather.mockResolvedValue(mockWeatherData);
      (notificationService.sendWeatherNotification as jest.Mock).mockResolvedValue({
        success: true,
      });

      await scheduler.sendNotifications();

      expect(notificationService.sendWeatherNotification).toHaveBeenCalledTimes(1);
    });

    it('FCM 토큰이 없는 사용자는 건너뛰어야 함', async () => {
      const noTokenUser = {
        ...mockUsers[0],
        settings: {
          ...mockUsers[0].settings!,
          fcmToken: null,
        },
      };

      mockUserService.findAll.mockResolvedValue([noTokenUser, mockUsers[1]] as any);
      mockWeatherService.getWeather.mockResolvedValue(mockWeatherData);
      (notificationService.sendWeatherNotification as jest.Mock).mockResolvedValue({
        success: true,
      });

      await scheduler.sendNotifications();

      expect(notificationService.sendWeatherNotification).toHaveBeenCalledTimes(1);
    });

    it('위치 정보가 없는 사용자는 건너뛰어야 함', async () => {
      const noLocationUser = {
        ...mockUsers[0],
        settings: {
          ...mockUsers[0].settings!,
          locationLatitude: null,
          locationLongitude: null,
        },
      };

      mockUserService.findAll.mockResolvedValue([noLocationUser, mockUsers[1]] as any);
      mockWeatherService.getWeather.mockResolvedValue(mockWeatherData);
      (notificationService.sendWeatherNotification as jest.Mock).mockResolvedValue({
        success: true,
      });

      await scheduler.sendNotifications();

      expect(notificationService.sendWeatherNotification).toHaveBeenCalledTimes(1);
    });

    it('날씨 조회 실패 시 해당 사용자는 건너뛰고 계속 진행해야 함', async () => {
      mockUserService.findAll.mockResolvedValue(mockUsers as any);
      mockWeatherService.getWeather
        .mockRejectedValueOnce(new Error('Weather API error'))
        .mockResolvedValueOnce(mockWeatherData);
      (notificationService.sendWeatherNotification as jest.Mock).mockResolvedValue({
        success: true,
      });

      await scheduler.sendNotifications();

      expect(mockWeatherService.getWeather).toHaveBeenCalledTimes(2);
      expect(notificationService.sendWeatherNotification).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send notification to user',
        expect.objectContaining({
          userId: 'user-1',
          error: 'Weather API error',
        })
      );
    });

    it('알림 전송 실패 시 실패 카운트를 증가시켜야 함', async () => {
      mockUserService.findAll.mockResolvedValue(mockUsers as any);
      mockWeatherService.getWeather.mockResolvedValue(mockWeatherData);
      (notificationService.sendWeatherNotification as jest.Mock)
        .mockResolvedValueOnce({ success: false, error: 'FCM error' })
        .mockResolvedValueOnce({ success: true });

      await scheduler.sendNotifications();

      expect(logger.info).toHaveBeenCalledWith('Notifications sent successfully', {
        total: 2,
        success: 1,
        failed: 1,
      });
    });

    it('사용자 조회 실패 시 에러를 로깅해야 함', async () => {
      mockUserService.findAll.mockRejectedValue(new Error('Database error'));

      await scheduler.sendNotifications();

      expect(logger.error).toHaveBeenCalledWith('Failed to send notifications', {
        error: 'Database error',
      });
    });
  });
});
