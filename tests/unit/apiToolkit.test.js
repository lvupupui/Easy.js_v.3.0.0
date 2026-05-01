const ApiToolkit = require('../../core/apiToolkit');

describe('ApiToolkit', () => {
  it('normalizes pagination, filters, and sort options', () => {
    const toolkit = new ApiToolkit({ defaultLimit: 10, maxLimit: 50 });

    expect(toolkit.pagination({ limit: '999', skip: '5' })).toEqual({
      limit: 50,
      offset: 5,
      skip: 5,
      cursor: null
    });
    expect(toolkit.buildFilter({ role: 'admin', hidden: 'x', empty: '' }, ['role', 'empty'])).toEqual({
      role: 'admin'
    });
    expect(toolkit.buildSort('-createdAt,name')).toEqual({
      createdAt: 'desc',
      name: 'asc'
    });
    expect(toolkit.pagination({ limit: '-5', offset: '-2', cursor: 'next' })).toEqual({
      limit: 1,
      offset: 0,
      skip: 0,
      cursor: 'next'
    });
    expect(toolkit.buildSort(' , -updatedAt, title ')).toEqual({
      updatedAt: 'desc',
      title: 'asc'
    });
    expect(toolkit.buildSort()).toEqual({});
  });

  it('runs request and response interceptors', async () => {
    const toolkit = new ApiToolkit();
    const req = { touched: false };
    const originalJson = jest.fn();
    const res = { json: originalJson };
    const next = jest.fn();
    toolkit
      .useRequest(async request => {
        request.touched = true;
      })
      .useResponse(async (request, response, body) => ({
        ...body,
        intercepted: request.touched
      }));

    await toolkit.interceptorMiddleware()(req, res, next);
    await res.json({ ok: true });

    expect(next).toHaveBeenCalled();
    expect(originalJson).toHaveBeenCalledWith({ ok: true, intercepted: true });
  });

  it('passes interceptor errors to next and mounts registered API versions', async () => {
    const toolkit = new ApiToolkit();
    const error = new Error('request blocked');
    toolkit.useRequest(() => {
      throw error;
    });
    const next = jest.fn();

    await toolkit.interceptorMiddleware()({}, { json: jest.fn() }, next);
    expect(next).toHaveBeenCalledWith(error);

    const versionRouter = jest.fn();
    const router = toolkit.registerVersion('v1', versionRouter).versionedRouter();
    expect(router.stack.some(layer => layer.regexp.test('/v1'))).toBe(true);
  });

  it('validates request payloads and preserves validated values', async () => {
    const toolkit = new ApiToolkit();
    const next = jest.fn();
    const req = { body: { email: 'a@example.com' }, query: {}, params: {} };
    const schema = {
      validate: jest.fn(() => ({ value: { body: { email: 'clean@example.com' } } }))
    };

    await toolkit.validate(schema)(req, {}, next);
    expect(req.validated).toEqual({ body: { email: 'clean@example.com' } });
    expect(next).toHaveBeenCalledWith();

    const noSchemaNext = jest.fn();
    await toolkit.validate(null)({}, {}, noSchemaNext);
    expect(noSchemaNext).toHaveBeenCalledWith();

    const invalidNext = jest.fn();
    await toolkit.validate({
      validate: () => ({ error: { message: 'bad payload' } })
    })({ body: {}, query: {}, params: {} }, {}, invalidNext);
    expect(invalidNext).toHaveBeenCalledWith(expect.objectContaining({
      message: 'bad payload',
      statusCode: 400,
      code: 'VALIDATION_ERROR'
    }));
  });

  it('applies cache headers and exports CSV safely', () => {
    const toolkit = new ApiToolkit();
    const res = { set: jest.fn() };
    const next = jest.fn();

    toolkit.cacheHeaders({ maxAge: 60, private: true, etag: true })(
      { originalUrl: '/items?search=a' },
      res,
      next
    );

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, max-age=60');
    expect(res.set).toHaveBeenCalledWith('ETag', expect.stringMatching(/^"[a-f0-9]{40}"$/));
    expect(next).toHaveBeenCalled();
    expect(toolkit.exportCSV([{ name: 'A "quoted" value', age: 3 }])).toBe(
      '"name","age"\n"A ""quoted"" value","3"'
    );
    expect(toolkit.exportCSV([{ name: null, age: 4 }], ['name'])).toBe('"name"\n""');

    const noStore = { set: jest.fn() };
    toolkit.cacheHeaders()( { originalUrl: '/no-store' }, noStore, jest.fn());
    expect(noStore.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('builds Postman collection metadata', () => {
    const toolkit = new ApiToolkit();
    const collection = toolkit.postmanCollection({
      name: 'Test API',
      routes: [{ method: 'post', path: '/users', name: 'Create user' }],
      baseUrl: 'http://localhost:3000'
    });

    expect(collection.info.name).toBe('Test API');
    expect(collection.item[0].request.method).toBe('POST');
    expect(collection.item[0].request.url).toBe('{{baseUrl}}/users');

    const defaultCollection = toolkit.postmanCollection({
      routes: [{ path: '/health', headers: [{ key: 'Accept', value: 'application/json' }] }]
    });
    expect(defaultCollection.item[0].name).toBe('GET /health');
    expect(defaultCollection.item[0].request.header).toEqual([{ key: 'Accept', value: 'application/json' }]);
    expect(toolkit.normalize({ id: 1 }, { page: 2 })).toEqual({
      success: true,
      data: { id: 1 },
      meta: expect.objectContaining({ page: 2, timestamp: expect.any(String) })
    });
  });
});
