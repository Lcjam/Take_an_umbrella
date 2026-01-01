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
});
