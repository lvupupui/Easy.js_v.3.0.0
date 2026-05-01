const MiddlewareManager = require('../../core/middleware');

describe('MiddlewareManager', () => {
  afterEach(() => {
    delete process.env.DEBUG;
  });

  it('sanitizes nested request bodies', () => {
    expect(MiddlewareManager.sanitizeObject({
      name: '  Alice  ',
      profile: { city: '  Delhi ' },
      count: 2
    })).toEqual({
      name: 'Alice',
      profile: { city: 'Delhi' },
      count: 2
    });
  });

  it('applies CORS headers and handles OPTIONS preflight', () => {
    const middleware = MiddlewareManager.createCorsMiddleware(['https://example.com']);
    const res = {
      header: jest.fn(),
      sendStatus: jest.fn()
    };
    const next = jest.fn();

    middleware({
      method: 'OPTIONS',
      headers: { origin: 'https://example.com' }
    }, res, next);

    expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
    expect(res.sendStatus).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();

    const wildcard = MiddlewareManager.createCorsMiddleware();
    const wildcardRes = { header: jest.fn(), sendStatus: jest.fn() };
    const wildcardNext = jest.fn();
    wildcard({ method: 'GET', headers: {} }, wildcardRes, wildcardNext);
    expect(wildcardRes.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(wildcardNext).toHaveBeenCalled();

    const deniedNext = jest.fn();
    const deniedRes = { header: jest.fn(), sendStatus: jest.fn() };
    middleware({ method: 'GET', headers: { origin: 'https://blocked.example' } }, deniedRes, deniedNext);
    expect(deniedRes.header).not.toHaveBeenCalled();
    expect(deniedNext).toHaveBeenCalled();
  });

  it('sanitizes request bodies through request validation middleware', () => {
    const req = { body: { name: '  Bob  ' } };
    const next = jest.fn();

    MiddlewareManager.createRequestValidationMiddleware()(req, {}, next);

    expect(req.body).toEqual({ name: 'Bob' });
    expect(next).toHaveBeenCalled();
  });

  it('formats errors with configured status codes', () => {
    const middleware = MiddlewareManager.createErrorHandlingMiddleware();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    middleware({ message: 'Nope', status: 418 }, {}, res);

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Nope'
    });

    process.env.DEBUG = '1';
    const debugRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const error = new Error();
    error.stack = 'stack trace';
    middleware(error, {}, debugRes);
    expect(debugRes.status).toHaveBeenCalledWith(500);
    expect(debugRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal Server Error',
      stack: 'stack trace'
    });
  });

  it('logs requests and creates rate limit middleware', () => {
    const limiter = MiddlewareManager.createRateLimiter({ windowMs: 1000, max: 2 });
    expect(typeof limiter).toBe('function');

    const finishHandlers = [];
    const middleware = MiddlewareManager.createLoggingMiddleware();
    const next = jest.fn();
    middleware({
      method: 'GET',
      path: '/items'
    }, {
      statusCode: 200,
      on: (event, handler) => finishHandlers.push(handler)
    }, next);
    finishHandlers[0]();
    expect(next).toHaveBeenCalled();

    const errorFinishHandlers = [];
    middleware({
      method: 'POST',
      path: '/items'
    }, {
      statusCode: 404,
      on: (event, handler) => errorFinishHandlers.push(handler)
    }, jest.fn());
    errorFinishHandlers[0]();
  });
});
