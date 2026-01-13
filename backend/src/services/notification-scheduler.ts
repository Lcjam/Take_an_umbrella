import * as cron from 'node-cron';
import { UserService } from './user-service';
import { WeatherService } from './weather-service';
import notificationService from './notification-service';
import { logger } from '../utils/logger';

/**
 * 알림 스케줄러 서비스
 * node-cron을 사용하여 주기적으로 사용자에게 날씨 알림을 전송합니다.
 */
export class NotificationScheduler {
  private task: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor(
    private userService: UserService,
    private weatherService: WeatherService
  ) {}

  /**
   * 스케줄러를 시작합니다.
   * 기본적으로 매 분마다 실행되며, 사용자별 알림 시간에 맞춰 알림을 발송합니다.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    // 매 분마다 실행 (테스트 및 디버깅 용이성을 위해)
    // 프로덕션에서는 매 분마다 실행하고, 현재 시간과 사용자 알림 시간을 비교
    this.task = cron.schedule('* * * * *', async () => {
      await this.sendNotifications();
    });

    this.isRunning = true;
    logger.info('Notification scheduler started');
  }

  /**
   * 스케줄러를 중지합니다.
   */
  stop(): void {
    if (!this.isRunning || !this.task) {
      logger.warn('Scheduler is not running');
      return;
    }

    this.task.stop();
    this.task = null;
    this.isRunning = false;
    logger.info('Notification scheduler stopped');
  }

  /**
   * 모든 활성 사용자에게 날씨 알림을 전송합니다.
   * 각 사용자의 위치 정보를 기반으로 날씨 데이터를 조회하고,
   * FCM을 통해 알림을 발송합니다.
   */
  async sendNotifications(): Promise<void> {
    try {
      // 모든 사용자 조회
      const users = await this.userService.findAll();

      let successCount = 0;
      let failedCount = 0;

      // 각 사용자에게 알림 전송
      for (const user of users) {
        try {
          // 필수 조건 확인
          if (!user.settings) {
            continue;
          }

          const settings = user.settings as unknown as {
            notificationEnabled: boolean;
            notificationTime: string;
            fcmToken: string | null;
            locationLatitude: number | null;
            locationLongitude: number | null;
          };

          // 알림이 비활성화된 경우 건너뛰기
          if (!settings.notificationEnabled) {
            continue;
          }

          // 현재 시간과 알림 시간 비교 (HH:mm 형식, 한국 시간 기준)
          const now = new Date();
          // 한국 시간으로 변환 (Asia/Seoul, en-US 로케일 사용)
          const currentTime = now.toLocaleTimeString('en-US', {
            timeZone: 'Asia/Seoul',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }); // "HH:mm" 형식
          const userNotificationTime = settings.notificationTime.substring(0, 5); // "HH:mm:ss" -> "HH:mm"

          // 알림 시간이 현재 시간과 다른 경우 건너뛰기
          if (currentTime !== userNotificationTime) {
            continue;
          }

          logger.debug('Sending notification to user at scheduled time', {
            userId: user.id,
            notificationTime: userNotificationTime,
            currentTime,
          });

          // FCM 토큰이 없는 경우 건너뛰기
          if (!settings.fcmToken) {
            logger.debug('User has no FCM token, skipping', { userId: user.id });
            continue;
          }

          // 위치 정보가 없는 경우 건너뛰기
          if (settings.locationLatitude === null || settings.locationLongitude === null) {
            logger.debug('User has no location, skipping', { userId: user.id });
            continue;
          }

          // 날씨 데이터 조회
          const weatherData = await this.weatherService.getWeather(
            Number(settings.locationLatitude),
            Number(settings.locationLongitude)
          );

          // 알림 전송
          const result = await notificationService.sendWeatherNotification(
            settings.fcmToken,
            weatherData
          );

          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            logger.warn('Failed to send notification', {
              userId: user.id,
              error: result.error,
            });
          }
        } catch (error) {
          failedCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Failed to send notification to user', {
            userId: user.id,
            error: errorMessage,
          });
        }
      }

      logger.info('Notifications sent successfully', {
        total: successCount + failedCount,
        success: successCount,
        failed: failedCount,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send notifications', {
        error: errorMessage,
      });
    }
  }

  /**
   * 스케줄러의 실행 상태를 반환합니다.
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}

// 싱글톤 인스턴스 export
const userService = new UserService();
const weatherService = new WeatherService();
export default new NotificationScheduler(userService, weatherService);
