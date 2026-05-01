const { requestLogger, errorRequestLogger } = require('../../middleware/requestLogger');

describe('request logger middleware', () => {
  it('logs when json responses are sent', () => {
    const req = {
      method: 'GET',
      path: '/items',
      user: { id: 'user-1' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('jest')
    };
    const originalJson = jest.fn();
    const res = {
      statusCode: 200,
      json: originalJson
    };
    const next = jest.fn();

    requestLogger(req, res, next);
    res.json({ ok: true });

    expect(next).toHaveBeenCalled();
    expect(originalJson).toHaveBeenCalledWith({ ok: true });
    expect(res._responseTime).toEqual(expect.any(Number));
  });

  it('attaches finish listener for error responses', () => {
    const finishHandlers = [];
    const req = {
      method: 'POST',
      path: '/items',
      user: { id: 'user-1' },
      ip: '127.0.0.1',
      body: { title: 'Bad' }
    };
    const res = {
      statusCode: 500,
      on: jest.fn((event, handler) => {
        if (event === 'finish') finishHandlers.push(handler);
      })
    };
    const next = jest.fn();

    errorRequestLogger(req, res, next);
    finishHandlers[0]();

    expect(next).toHaveBeenCalled();
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });
});
