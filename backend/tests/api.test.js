const request = require('supertest');
const app = require('../server');

describe('Udyam API Tests', () => {
  test('POST /api/validate-step1 - Valid data', async () => {
    const response = await request(app)
      .post('/api/validate-step1')
      .send({
        aadhaar: '123456789012',
        otp: '123456'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('POST /api/validate-step1 - Invalid Aadhaar', async () => {
    const response = await request(app)
      .post('/api/validate-step1')
      .send({
        aadhaar: '12345',
        otp: '123456'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test('POST /api/validate-step2 - Valid PAN', async () => {
    const response = await request(app)
      .post('/api/validate-step2')
      .send({
        pan: 'ABCDE1234F',
        submissionId: 1
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
