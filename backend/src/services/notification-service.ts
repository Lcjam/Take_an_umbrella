import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

/**
 * 알림 전송 결과 인터페이스
 */
export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 다중 알림 전송 결과 인터페이스
 */
export interface MultipleNotificationResult {
  successCount: number;
  failureCount: number;
  responses: NotificationResult[];
}

/**
 * 날씨 데이터 인터페이스
 */
export interface WeatherNotificationData {
  temperature: number;
  skyCondition: string;
  precipitationType: string;
  precipitationProbability: number;
}

/**
 * 알림 발송 서비스
 * Firebase Cloud Messaging (FCM)을 사용하여 푸시 알림을 전송합니다.
 */
export class NotificationService {
  /**
   * 단일 기기에 알림을 전송합니다.
   * @param token - FCM 토큰
   * @param title - 알림 제목
   * @param body - 알림 내용
   * @param data - 추가 데이터 (선택사항)
   * @returns 전송 결과
   */
  async sendToDevice(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<NotificationResult> {
    try {
      // 입력 검증
      if (!token || token.trim() === '') {
        return {
          success: false,
          error: 'FCM token is required',
        };
      }

      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
        },
        ...(data && { data }),
      };

      const response = await admin.messaging().send(message);

      logger.info('Notification sent successfully', {
        token,
        messageId: response,
      });

      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send notification', {
        token,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 여러 기기에 알림을 전송합니다.
   * @param tokens - FCM 토큰 배열
   * @param title - 알림 제목
   * @param body - 알림 내용
   * @param data - 추가 데이터 (선택사항)
   * @returns 전송 결과
   */
  async sendToMultipleDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<MultipleNotificationResult> {
    try {
      // 빈 배열 체크
      if (!tokens || tokens.length === 0) {
        return {
          successCount: 0,
          failureCount: 0,
          responses: [],
        };
      }

      const messages: admin.messaging.Message[] = tokens.map(token => ({
        token,
        notification: {
          title,
          body,
        },
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
        },
        ...(data && { data }),
      }));

      const response = await admin.messaging().sendEach(messages);

      const responses: NotificationResult[] = response.responses.map(result => {
        if (result.success) {
          return {
            success: true,
            messageId: result.messageId,
          };
        } else {
          return {
            success: false,
            error: result.error?.message || 'Unknown error',
          };
        }
      });

      logger.info('Multiple notifications sent', {
        total: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      if (response.failureCount > 0) {
        logger.warn('Some notifications failed to send', {
          successCount: response.successCount,
          failureCount: response.failureCount,
        });
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send multiple notifications', {
        error: errorMessage,
      });

      return {
        successCount: 0,
        failureCount: tokens.length,
        responses: tokens.map(() => ({
          success: false,
          error: errorMessage,
        })),
      };
    }
  }

  /**
   * 날씨 기반 알림을 전송합니다.
   * @param token - FCM 토큰
   * @param weatherData - 날씨 데이터
   * @returns 전송 결과
   */
  async sendWeatherNotification(
    token: string,
    weatherData: WeatherNotificationData
  ): Promise<NotificationResult> {
    const { temperature, skyCondition, precipitationType, precipitationProbability } = weatherData;

    // 알림 메시지 생성
    const title = '오늘의 날씨 알림';
    let body = `현재 ${temperature}°C, ${skyCondition}입니다.`;

    // 강수 정보 추가
    if (precipitationType !== '없음') {
      body += ` ${precipitationType}이(가) 예상됩니다.`;
    }

    if (precipitationProbability >= 30) {
      body += ` 우산을 챙기세요!`;
    }

    return this.sendToDevice(token, title, body, {
      type: 'weather',
      temperature: temperature.toString(),
      skyCondition,
    });
  }
}

// 싱글톤 인스턴스 export
export default new NotificationService();
