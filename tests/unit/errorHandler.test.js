const { AppError, errorHandler, notFoundHandler } = require('../../middleware/errorHandler');

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
}

describe('errorHandler middleware', () => {
  const req = {
    method: 'GET',
    url: '/items',
    originalUrl: '/missing',
    ip: '127.0.0.1',
    body: {},
    query: {},
    params: {}
  };

  it('formats validation, auth, not found, conflict, and generic errors', () => {
    for (const [status, code] of [
      [400, 'VALIDATION_ERROR'],
      [401, 'AUTHENTICATION_ERROR'],
      [403, 'AUTHORIZATION_ERROR'],
      [404, 'NOT_FOUND'],
      [409, 'CONFLICT'],
      [418, 'CUSTOM']
    ]) {
      const res = createResponse();
      errorHandler(new AppError('message', status, code), req, res);
      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json.mock.calls[0][0].success).toBe(false);
    }
  });

  it('hides server details outside development', () => {
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = createResponse();

    errorHandler(new AppError('secret detail', 500, 'BROKEN'), req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error.message).toBe('An unexpected error occurred');
    process.env.NODE_ENV = oldEnv;
  });

  it('creates a not found error for unknown routes', () => {
    const next = jest.fn();

    notFoundHandler({ method: 'POST', originalUrl: '/missing' }, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cannot POST /missing'
    }));
  });
});
