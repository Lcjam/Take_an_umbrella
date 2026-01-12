import { NotificationService } from '../../services/notification-service';
import * as admin from 'firebase-admin';
import { logger } from '../../utils/logger';

// Firebase Admin 모킹
jest.mock('firebase-admin', () => ({
  messaging: jest.fn(() => ({
    send: jest.fn(),
    sendEach: jest.fn(),
  })),
}));

// Logger 모킹
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockSend: jest.Mock;
  let mockSendEach: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = new NotificationService();

    // Firebase messaging mock 설정
    mockSend = jest.fn();
    mockSendEach = jest.fn();
    (admin.messaging as jest.Mock).mockReturnValue({
      send: mockSend,
      sendEach: mockSendEach,
    });
  });

  describe('sendToDevice', () => {
    it('단일 기기에 알림을 성공적으로 전송해야 함', async () => {
      const token = 'test-fcm-token';
      const title = '오늘 날씨';
      const body = '오늘은 비가 올 예정입니다. 우산을 챙기세요!';

      // Firebase의 send() 메서드는 messageId 문자열을 직접 반환합니다
      mockSend.mockResolvedValue('message-123');

      const result = await notificationService.sendToDevice(token, title, body);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('message-123');
      expect(mockSend).toHaveBeenCalledWith({
        token,
        notification: { title, body },
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
        },
      });
      expect(logger.info).toHaveBeenCalledWith('Notification sent successfully', {
        token,
        messageId: 'message-123',
      });
    });

    it('알림 전송 실패 시 에러를 기록하고 실패 결과를 반환해야 함', async () => {
      const token = 'invalid-token';
      const title = '테스트';
      const body = '테스트 메시지';
      const error = new Error('Invalid token');

      mockSend.mockRejectedValue(error);

      const result = await notificationService.sendToDevice(token, title, body);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
      expect(logger.error).toHaveBeenCalledWith('Failed to send notification', {
        token,
        error: 'Invalid token',
      });
    });

    it('빈 토큰인 경우 에러를 반환해야 함', async () => {
      const result = await notificationService.sendToDevice('', '제목', '내용');

      expect(result.success).toBe(false);
      expect(result.error).toContain('token is required');
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('sendToMultipleDevices', () => {
    it('여러 기기에 알림을 성공적으로 전송해야 함', async () => {
      const tokens = ['token-1', 'token-2', 'token-3'];
      const title = '날씨 알림';
      const body = '비가 옵니다';

      mockSendEach.mockResolvedValue({
        successCount: 3,
        failureCount: 0,
        responses: [
          { success: true, messageId: 'msg-1' },
          { success: true, messageId: 'msg-2' },
          { success: true, messageId: 'msg-3' },
        ],
      });

      const result = await notificationService.sendToMultipleDevices(tokens, title, body);

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(mockSendEach).toHaveBeenCalledWith([
        {
          token: 'token-1',
          notification: { title, body },
          android: { priority: 'high' },
          apns: { headers: { 'apns-priority': '10' } },
        },
        {
          token: 'token-2',
          notification: { title, body },
          android: { priority: 'high' },
          apns: { headers: { 'apns-priority': '10' } },
        },
        {
          token: 'token-3',
          notification: { title, body },
          android: { priority: 'high' },
          apns: { headers: { 'apns-priority': '10' } },
        },
      ]);
    });

    it('일부 기기 전송 실패 시 성공/실패 카운트를 올바르게 반환해야 함', async () => {
      const tokens = ['token-1', 'token-2', 'token-3'];
      const title = '알림';
      const body = '내용';

      mockSendEach.mockResolvedValue({
        successCount: 2,
        failureCount: 1,
        responses: [
          { success: true, messageId: 'msg-1' },
          { success: false, error: new Error('Invalid token') },
          { success: true, messageId: 'msg-3' },
        ],
      });

      const result = await notificationService.sendToMultipleDevices(tokens, title, body);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith('Some notifications failed to send', {
        successCount: 2,
        failureCount: 1,
      });
    });

    it('빈 토큰 배열인 경우 에러를 반환해야 함', async () => {
      const result = await notificationService.sendToMultipleDevices([], '제목', '내용');

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(mockSendEach).not.toHaveBeenCalled();
    });
  });

  describe('sendWeatherNotification', () => {
    it('날씨 기반 알림을 전송해야 함', async () => {
      const token = 'test-token';
      const weatherData = {
        temperature: 15,
        skyCondition: '맑음',
        precipitationType: '없음',
        precipitationProbability: 10,
      };

      mockSend.mockResolvedValue({ success: true, messageId: 'msg-123' });

      const result = await notificationService.sendWeatherNotification(token, weatherData);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.notification.title).toContain('날씨');
      expect(callArgs.notification.body).toContain('15°C');
    });
  });
});
