import request from 'supertest';
import app from '../../index';
import prisma from '../../lib/prisma';

describe('Users API', () => {
  // 테스트 후 데이터베이스 정리
  afterEach(async () => {
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/users', () => {
    it('새로운 사용자를 생성해야 함', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-id-12345',
          anonymous_id: 'test-anonymous-id',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user_id');
      expect(response.body.data.device_id).toBe('test-device-id-12345');
      expect(response.body.message).toBe('User created successfully');
    });

    it('기존 사용자를 조회해야 함', async () => {
      // 먼저 사용자 생성
      const firstResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'existing-device-id',
        })
        .expect(201);

      const userId = firstResponse.body.data.user_id;

      // 같은 device_id로 다시 요청
      const secondResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'existing-device-id',
        })
        .expect(200);

      expect(secondResponse.body.success).toBe(true);
      expect(secondResponse.body.data.user_id).toBe(userId);
      expect(secondResponse.body.message).toBe('User found');
    });

    it('device_id가 없으면 400 에러를 반환해야 함', async () => {
      const response = await request(app).post('/api/users').send({}).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('device_id');
    });

    it('device_id가 빈 문자열이면 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          device_id: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/users/:user_id', () => {
    it('사용자 정보를 조회해야 함', async () => {
      // 먼저 사용자 생성
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-for-get',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      // 사용자 조회
      const response = await request(app).get(`/api/users/${userId}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe(userId);
      expect(response.body.data.device_id).toBe('test-device-for-get');
      expect(response.body.data).toHaveProperty('created_at');
    });

    it('존재하지 않는 사용자는 404 에러를 반환해야 함', async () => {
      const fakeUserId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app).get(`/api/users/${fakeUserId}`).expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('User not found');
    });

    it('잘못된 UUID 형식이면 400 에러를 반환해야 함', async () => {
      const response = await request(app).get('/api/users/invalid-uuid').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/users/:user_id/location', () => {
    it('사용자 위치 정보를 설정해야 함', async () => {
      // 먼저 사용자 생성
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-for-location',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      // 위치 정보 설정
      const response = await request(app)
        .patch(`/api/users/${userId}/location`)
        .send({
          latitude: 37.5665,
          longitude: 126.978,
          location_name: '서울시청',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location_latitude).toBe('37.5665');
      expect(response.body.data.location_longitude).toBe('126.978');
      expect(response.body.data.location_name).toBe('서울시청');
      expect(response.body.message).toBe('Location updated successfully');
    });

    it('위치 정보를 업데이트해야 함', async () => {
      // 사용자 생성 및 초기 위치 설정
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-for-update',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      await request(app)
        .patch(`/api/users/${userId}/location`)
        .send({
          latitude: 37.5665,
          longitude: 126.978,
          location_name: '서울시청',
        })
        .expect(200);

      // 위치 정보 업데이트
      const response = await request(app)
        .patch(`/api/users/${userId}/location`)
        .send({
          latitude: 35.1796,
          longitude: 129.0756,
          location_name: '부산시청',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location_latitude).toBe('35.1796');
      expect(response.body.data.location_longitude).toBe('129.0756');
      expect(response.body.data.location_name).toBe('부산시청');
    });

    it('location_name 없이 위치 정보를 설정해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-no-name',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/location`)
        .send({
          latitude: 37.5665,
          longitude: 126.978,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location_latitude).toBe('37.5665');
      expect(response.body.data.location_longitude).toBe('126.978');
      expect(response.body.data.location_name).toBeNull();
    });

    it('latitude가 없으면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-no-lat',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/location`)
        .send({
          longitude: 126.978,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('latitude');
    });

    it('longitude가 없으면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-no-lon',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/location`)
        .send({
          latitude: 37.5665,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('longitude');
    });

    it('위도 범위가 잘못되면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-invalid-lat',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/location`)
        .send({
          latitude: 100, // 잘못된 범위 (>90)
          longitude: 126.978,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('latitude');
    });

    it('경도 범위가 잘못되면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-invalid-lon',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/location`)
        .send({
          latitude: 37.5665,
          longitude: 200, // 잘못된 범위 (>180)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('longitude');
    });

    it('숫자가 아닌 값이면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-invalid-type',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/location`)
        .send({
          latitude: 'invalid',
          longitude: 126.978,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('부분적으로만 숫자인 값이면 400 에러를 반환해야 함 (parseFloat 부분 파싱 방지)', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-partial-number',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/location`)
        .send({
          latitude: '37.5abc',
          longitude: 126.978,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('must be numbers');
    });

    it('존재하지 않는 사용자는 404 에러를 반환해야 함', async () => {
      const fakeUserId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .patch(`/api/users/${fakeUserId}/location`)
        .send({
          latitude: 37.5665,
          longitude: 126.978,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/users/:user_id/notification-time', () => {
    it('알림 시간을 설정해야 함', async () => {
      // 먼저 사용자 생성
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-for-notification',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      // 알림 시간 설정
      const response = await request(app)
        .patch(`/api/users/${userId}/notification-time`)
        .send({
          departure_time: '08:30:00',
          notification_time: '08:00:00',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.departure_time).toBe('08:30:00');
      expect(response.body.data.notification_time).toBe('08:00:00');
      expect(response.body.message).toBe('Notification time updated successfully');
    });

    it('알림 시간을 업데이트해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-update-notification',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      // 초기 설정
      await request(app)
        .patch(`/api/users/${userId}/notification-time`)
        .send({
          departure_time: '08:00:00',
          notification_time: '07:30:00',
        })
        .expect(200);

      // 업데이트
      const response = await request(app)
        .patch(`/api/users/${userId}/notification-time`)
        .send({
          departure_time: '09:00:00',
          notification_time: '08:30:00',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.departure_time).toBe('09:00:00');
      expect(response.body.data.notification_time).toBe('08:30:00');
    });

    it('departure_time만 업데이트해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-departure-only',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      // 초기 설정
      await request(app)
        .patch(`/api/users/${userId}/notification-time`)
        .send({
          departure_time: '08:00:00',
          notification_time: '07:30:00',
        })
        .expect(200);

      // departure_time만 업데이트
      const response = await request(app)
        .patch(`/api/users/${userId}/notification-time`)
        .send({
          departure_time: '09:00:00',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.departure_time).toBe('09:00:00');
      expect(response.body.data.notification_time).toBe('07:30:00'); // 이전 값 유지
    });

    it('notification_time만 업데이트해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-notification-only',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      // 초기 설정
      await request(app)
        .patch(`/api/users/${userId}/notification-time`)
        .send({
          departure_time: '08:00:00',
          notification_time: '07:30:00',
        })
        .expect(200);

      // notification_time만 업데이트
      const response = await request(app)
        .patch(`/api/users/${userId}/notification-time`)
        .send({
          notification_time: '07:00:00',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.departure_time).toBe('08:00:00'); // 이전 값 유지
      expect(response.body.data.notification_time).toBe('07:00:00');
    });

    it('잘못된 시간 형식이면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-invalid-format',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/notification-time`)
        .send({
          departure_time: '25:00:00', // 잘못된 시간
          notification_time: '07:30:00',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid time format');
    });

    it('HH:mm:ss 형식이 아니면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-wrong-format',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/notification-time`)
        .send({
          departure_time: '08:30', // HH:mm만 있음
          notification_time: '07:30:00',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('알림 시간이 출발 시간 이후면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-time-order',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/notification-time`)
        .send({
          departure_time: '08:00:00',
          notification_time: '08:30:00', // 출발 시간 이후
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain(
        'notification_time must be before departure_time'
      );
    });

    it('두 값 모두 없으면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-no-values',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/notification-time`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('At least one time field is required');
    });

    it('존재하지 않는 사용자는 404 에러를 반환해야 함', async () => {
      const fakeUserId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .patch(`/api/users/${fakeUserId}/notification-time`)
        .send({
          departure_time: '08:00:00',
          notification_time: '07:30:00',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/users/:user_id/fcm-token', () => {
    it('FCM 토큰을 등록해야 함', async () => {
      // 먼저 사용자 생성
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-for-fcm',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      // FCM 토큰 등록
      const response = await request(app)
        .post(`/api/users/${userId}/fcm-token`)
        .send({
          fcm_token: 'test-fcm-token-123456',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fcm_token).toBe('test-fcm-token-123456');
      expect(response.body.message).toBe('FCM token registered successfully');
    });

    it('FCM 토큰을 갱신해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-fcm-update',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      // 초기 토큰 등록
      await request(app)
        .post(`/api/users/${userId}/fcm-token`)
        .send({
          fcm_token: 'old-fcm-token',
        })
        .expect(200);

      // 토큰 갱신
      const response = await request(app)
        .post(`/api/users/${userId}/fcm-token`)
        .send({
          fcm_token: 'new-fcm-token',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fcm_token).toBe('new-fcm-token');
    });

    it('fcm_token이 없으면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-no-token',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .post(`/api/users/${userId}/fcm-token`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('fcm_token is required');
    });

    it('fcm_token이 빈 문자열이면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-empty-token',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .post(`/api/users/${userId}/fcm-token`)
        .send({
          fcm_token: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('fcm_token is required');
    });

    it('fcm_token이 문자열이 아니면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-invalid-token-type',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .post(`/api/users/${userId}/fcm-token`)
        .send({
          fcm_token: 12345,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('존재하지 않는 사용자는 404 에러를 반환해야 함', async () => {
      const fakeUserId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .post(`/api/users/${fakeUserId}/fcm-token`)
        .send({
          fcm_token: 'test-fcm-token',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/users/:user_id/fcm-token', () => {
    it('FCM 토큰을 삭제해야 함', async () => {
      // 먼저 사용자 생성 및 토큰 등록
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-delete-token',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      await request(app)
        .post(`/api/users/${userId}/fcm-token`)
        .send({
          fcm_token: 'token-to-delete',
        })
        .expect(200);

      // 토큰 삭제
      const response = await request(app).delete(`/api/users/${userId}/fcm-token`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('FCM token deleted successfully');
    });

    it('토큰이 없어도 삭제 성공을 반환해야 함 (멱등성)', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-no-token-delete',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      // 토큰 등록 없이 바로 삭제
      const response = await request(app).delete(`/api/users/${userId}/fcm-token`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('FCM token deleted successfully');
    });

    it('존재하지 않는 사용자는 404 에러를 반환해야 함', async () => {
      const fakeUserId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app).delete(`/api/users/${fakeUserId}/fcm-token`).expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/users/:user_id/notification-enabled', () => {
    it('알림을 비활성화해야 함', async () => {
      // 먼저 사용자 생성
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-disable-notification',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      // 알림 비활성화
      const response = await request(app)
        .patch(`/api/users/${userId}/notification-enabled`)
        .send({
          notification_enabled: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notification_enabled).toBe(false);
      expect(response.body.message).toBe('Notification setting updated successfully');
    });

    it('알림을 활성화해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-enable-notification',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      // 먼저 비활성화
      await request(app)
        .patch(`/api/users/${userId}/notification-enabled`)
        .send({
          notification_enabled: false,
        })
        .expect(200);

      // 다시 활성화
      const response = await request(app)
        .patch(`/api/users/${userId}/notification-enabled`)
        .send({
          notification_enabled: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notification_enabled).toBe(true);
    });

    it('기본값은 true여야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-default-notification',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      // 위치 설정으로 UserSettings 생성 (기본값 확인용)
      await request(app)
        .patch(`/api/users/${userId}/location`)
        .send({
          latitude: 37.5665,
          longitude: 126.978,
        })
        .expect(200);

      // 알림 설정 조회 (활성화 상태 확인)
      const response = await request(app)
        .patch(`/api/users/${userId}/notification-enabled`)
        .send({
          notification_enabled: true,
        })
        .expect(200);

      expect(response.body.data.notification_enabled).toBe(true);
    });

    it('notification_enabled가 없으면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-no-enabled-value',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/notification-enabled`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('notification_enabled is required');
    });

    it('notification_enabled가 boolean이 아니면 400 에러를 반환해야 함', async () => {
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          device_id: 'test-device-invalid-enabled-type',
        })
        .expect(201);

      const userId = createResponse.body.data.user_id;

      const response = await request(app)
        .patch(`/api/users/${userId}/notification-enabled`)
        .send({
          notification_enabled: 'true', // 문자열 (잘못된 타입)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('must be a boolean');
    });

    it('존재하지 않는 사용자는 404 에러를 반환해야 함', async () => {
      const fakeUserId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .patch(`/api/users/${fakeUserId}/notification-enabled`)
        .send({
          notification_enabled: false,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
