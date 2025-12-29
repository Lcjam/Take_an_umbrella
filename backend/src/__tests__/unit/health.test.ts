import request from 'supertest';
import app from '../../index';

describe('Health Check', () => {
  it('should return 200 and ok status', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      message: 'Server is running',
    });
  });
});

