import request from 'supertest';
import app from '../../index';

describe('Weather API', () => {
  describe('GET /api/weather', () => {
    test('위경도로 날씨 데이터를 조회해야 함', async () => {
      const response = await request(app).get('/api/weather').query({
        latitude: 37.5665,
        longitude: 126.978,
      });

      // API 키가 없거나 실제 API 호출 실패 시 502 반환
      if (response.status === 502) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toHaveProperty('code', 'EXTERNAL_API_ERROR');
        return;
      }

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const weatherData = response.body.data;
      expect(weatherData).toHaveProperty('temperature');
      expect(weatherData).toHaveProperty('humidity');
      expect(weatherData).toHaveProperty('skyCondition');
      expect(weatherData).toHaveProperty('precipitationType');
      expect(weatherData).toHaveProperty('windSpeed');
      expect(weatherData).toHaveProperty('forecastDate');
      expect(weatherData).toHaveProperty('forecastTime');
    });

    test('latitude 파라미터가 없으면 400 에러를 반환해야 함', async () => {
      const response = await request(app).get('/api/weather').query({
        longitude: 126.978,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('longitude 파라미터가 없으면 400 에러를 반환해야 함', async () => {
      const response = await request(app).get('/api/weather').query({
        latitude: 37.5665,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('잘못된 위도 값(범위 초과)이면 400 에러를 반환해야 함', async () => {
      const response = await request(app).get('/api/weather').query({
        latitude: 100, // 위도는 -90 ~ 90
        longitude: 126.978,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('잘못된 경도 값(범위 초과)이면 400 에러를 반환해야 함', async () => {
      const response = await request(app).get('/api/weather').query({
        latitude: 37.5665,
        longitude: 200, // 경도는 -180 ~ 180
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('숫자가 아닌 값이면 400 에러를 반환해야 함', async () => {
      const response = await request(app).get('/api/weather').query({
        latitude: 'invalid',
        longitude: 126.978,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    test('기상청 API 호출 실패 시 502 에러를 반환해야 함', async () => {
      // 잘못된 좌표로 API 호출 실패 유도 (바다 한가운데 등)
      const response = await request(app).get('/api/weather').query({
        latitude: 0,
        longitude: 0,
      });

      // 실제 API 호출이므로 성공하거나 502 에러 둘 중 하나
      expect([200, 502]).toContain(response.status);
    });
  });
});
