const jwt = require('jsonwebtoken');
const RealtimeEngine = require('../../core/realtime');

function createSocket() {
  return {
    readyState: 1,
    send: jest.fn(),
    close: jest.fn(),
    on: jest.fn()
  };
}

function lastMessage(ws) {
  const payload = ws.send.mock.calls.at(-1)[0];
  return JSON.parse(payload);
}

describe('RealtimeEngine', () => {
  it('authenticates websocket clients with a valid JWT secret', () => {
    const engine = new RealtimeEngine({ jwtSecret: 'test-secret' });
    const ws = createSocket();
    engine.handleConnection(ws, { user: null });

    const clientId = Array.from(engine.connections.keys())[0];
    const token = jwt.sign({ userId: 'user-1', role: 'admin' }, 'test-secret');
    const listener = jest.fn();
    engine.on('client:authenticated', listener);

    engine.handleAuth(clientId, { token });

    const connection = engine.connections.get(clientId);
    expect(connection.authenticated).toBe(true);
    expect(connection.userId).toBe('user-1');
    expect(lastMessage(ws)).toEqual({
      type: 'authenticated',
      success: true,
      userId: 'user-1'
    });
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      clientId,
      userId: 'user-1'
    }));
  });

  it('rejects invalid realtime auth tokens', () => {
    const engine = new RealtimeEngine({ jwtSecret: 'test-secret' });
    const ws = createSocket();
    engine.handleConnection(ws, {});

    const clientId = Array.from(engine.connections.keys())[0];
    engine.handleAuth(clientId, { token: 'bad-token' });

    expect(engine.connections.get(clientId).authenticated).toBe(false);
    expect(lastMessage(ws)).toEqual({
      type: 'authenticated',
      success: false,
      error: 'Authentication failed'
    });
  });

  it('uses an injected auth manager when provided', () => {
    const authManager = {
      verifyToken: jest.fn().mockReturnValue({ sub: 'subject-1' })
    };
    const engine = new RealtimeEngine({ authManager });
    const ws = createSocket();
    engine.handleConnection(ws, {});

    const clientId = Array.from(engine.connections.keys())[0];
    engine.handleAuth(clientId, { token: 'delegated-token' });

    expect(authManager.verifyToken).toHaveBeenCalledWith('delegated-token');
    expect(engine.connections.get(clientId).userId).toBe('subject-1');
  });

  it('manages subscriptions, publish broadcasts, and disconnections', () => {
    const engine = new RealtimeEngine();
    const wsA = createSocket();
    const wsB = createSocket();
    engine.handleConnection(wsA, {});
    engine.handleConnection(wsB, {});
    const [clientA, clientB] = Array.from(engine.connections.keys());

    engine.handleSubscribe(clientA, { channel: 'posts' });
    engine.handleSubscribe(clientB, { channel: 'posts' });
    engine.handlePublish(clientA, { channel: 'posts', data: { id: 1 } });

    expect(engine.channels.get('posts').size).toBe(2);
    expect(lastMessage(wsB)).toEqual(expect.objectContaining({
      type: 'message',
      channel: 'posts',
      data: { id: 1 },
      from: clientA
    }));

    engine.handleDisconnection(clientA);

    expect(engine.connections.has(clientA)).toBe(false);
    expect(engine.channels.get('posts').has(clientA)).toBe(false);
  });

  it('routes raw websocket messages for subscribe, ping, presence, unsubscribe, custom, and parse errors', () => {
    const engine = new RealtimeEngine();
    const ws = createSocket();
    const listener = jest.fn();
    engine.on('message', listener);
    engine.handleConnection(ws, { user: { id: 'user-1' } });
    const clientId = Array.from(engine.connections.keys())[0];

    engine.handleMessage(clientId, Buffer.from(JSON.stringify({ type: 'subscribe', channel: 'posts' })));
    expect(engine.channels.get('posts').has(clientId)).toBe(true);

    engine.handleMessage(clientId, Buffer.from(JSON.stringify({ type: 'ping' })));
    expect(lastMessage(ws)).toEqual(expect.objectContaining({ type: 'pong' }));

    engine.handleMessage(clientId, Buffer.from(JSON.stringify({ type: 'presence', action: 'update', status: 'away' })));
    expect(engine.presenceData.get(clientId)).toEqual(expect.objectContaining({ userId: 'user-1', status: 'away' }));
    expect(lastMessage(ws)).toEqual(expect.objectContaining({ type: 'presence_update' }));

    engine.handleMessage(clientId, Buffer.from(JSON.stringify({ type: 'unsubscribe', channel: 'posts' })));
    expect(engine.channels.has('posts')).toBe(false);
    expect(lastMessage(ws)).toEqual({ type: 'unsubscribed', channel: 'posts' });

    engine.handleMessage(clientId, Buffer.from(JSON.stringify({ type: 'custom', payload: true })));
    expect(listener).toHaveBeenCalledWith({ clientId, message: { type: 'custom', payload: true } });

    engine.handleMessage(clientId, Buffer.from('not-json'));
    expect(lastMessage(ws)).toEqual({ type: 'error', message: 'Invalid message format' });
    expect(engine.connections.get(clientId).messageCount).toBe(5);
    expect(engine.getStats()).toEqual(expect.objectContaining({
      connectedClients: 1,
      activeChannels: 0,
      totalMessagesSent: 5
    }));
  });

  it('ignores incomplete messages and handles send and connection errors', () => {
    const engine = new RealtimeEngine();
    const ws = createSocket();
    engine.handleConnection(ws, {});
    const clientId = Array.from(engine.connections.keys())[0];

    engine.handleSubscribe(clientId, {});
    engine.handlePublish(clientId, { channel: 'posts' });
    engine.handlePing('missing-client');
    engine.handlePresence('missing-client', { action: 'update' });
    engine.sendMessage('missing-client', { type: 'noop' });

    ws.readyState = 0;
    engine.sendMessage(clientId, { type: 'closed' });
    ws.readyState = 1;
    ws.send.mockImplementationOnce(() => { throw new Error('send broken'); });
    engine.sendMessage(clientId, { type: 'boom' });

    const errorListener = jest.fn();
    engine.on('error', errorListener);
    engine.handleError(clientId, new Error('socket broken'));
    expect(errorListener).toHaveBeenCalledWith({ clientId, error: expect.any(Error) });
  });

  it('streams chunks to a client and reports completion or source errors', async () => {
    const engine = new RealtimeEngine();
    const ws = createSocket();
    engine.handleConnection(ws, {});
    const clientId = Array.from(engine.connections.keys())[0];

    const streamSpy = jest.spyOn(engine, 'streamData').mockResolvedValueOnce();
    engine.startStream(clientId, 'declared-stream', { getChunk: jest.fn() });
    expect(engine.streams.get('declared-stream')).toEqual(expect.objectContaining({ clientId, chunks: 0, paused: false }));
    streamSpy.mockRestore();
    engine.streams.delete('declared-stream');

    const chunks = [{ value: 1 }, { value: 2 }, null];
    engine.streams.set('stream-1', {
      id: 'stream-1',
      clientId,
      dataSource: { getChunk: jest.fn(() => Promise.resolve(chunks.shift())) },
      started: Date.now(),
      paused: false,
      bytesStreamed: 0,
      chunks: 0
    });

    await engine.streamData('stream-1');

    expect(engine.streams.has('stream-1')).toBe(false);
    expect(ws.send.mock.calls.map(call => JSON.parse(call[0]).type)).toContain('stream_complete');

    engine.streams.set('stream-err', {
      id: 'stream-err',
      clientId,
      dataSource: { getChunk: jest.fn().mockRejectedValue(new Error('source broken')) },
      started: Date.now(),
      paused: false,
      bytesStreamed: 0,
      chunks: 0
    });

    await engine.streamData('stream-err');
    expect(lastMessage(ws)).toEqual({ type: 'stream_error', streamId: 'stream-err', error: 'source broken' });
    await expect(engine.streamData('missing-stream')).resolves.toBeUndefined();
  });

  it('closes all connections and tolerates close errors', () => {
    const engine = new RealtimeEngine();
    const wsA = createSocket();
    const wsB = createSocket();
    wsB.close.mockImplementation(() => { throw new Error('close broken'); });
    engine.handleConnection(wsA, {});
    engine.handleConnection(wsB, {});
    const [clientA] = Array.from(engine.connections.keys());
    engine.handleSubscribe(clientA, { channel: 'posts' });
    engine.streams.set('stream', {});

    engine.closeAll();

    expect(wsA.close).toHaveBeenCalledWith(1000, 'Server shutting down');
    expect(engine.connections.size).toBe(0);
    expect(engine.channels.size).toBe(0);
    expect(engine.streams.size).toBe(0);
  });
});
