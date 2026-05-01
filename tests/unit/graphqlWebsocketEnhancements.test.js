const GraphQLEnhancements = require('../../core/graphqlEnhancements');
const WebSocketEnhancements = require('../../core/websocketEnhancements');

describe('GraphQLEnhancements', () => {
  it('registers middleware, directives, cache entries, and subscriptions', () => {
    const graphql = new GraphQLEnhancements();
    const handler = jest.fn();
    const unsubscribe = graphql
      .use(jest.fn())
      .directive('auth', jest.fn())
      .subscription('posts.created', handler);

    expect(graphql.middleware).toHaveLength(1);
    expect(graphql.directives.has('auth')).toBe(true);
    expect(graphql.cacheQuery('posts', [{ id: 1 }], 1000)).toEqual([{ id: 1 }]);
    expect(graphql.getCachedQuery('posts')).toEqual([{ id: 1 }]);

    graphql.publish('posts.created', { id: 1 });
    expect(handler).toHaveBeenCalledWith({ id: 1 });

    unsubscribe();
    handler.mockClear();
    graphql.publish('posts.created', { id: 2 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('expires cached GraphQL entries', () => {
    const graphql = new GraphQLEnhancements();
    graphql.cacheQuery('expired', 'value', -1);

    expect(graphql.getCachedQuery('expired')).toBeNull();
  });
});

describe('WebSocketEnhancements', () => {
  it('wraps rooms, broadcasts, private messages, presence, and history', () => {
    const roomEmitter = { emit: jest.fn() };
    const io = {
      use: jest.fn(),
      to: jest.fn().mockReturnValue(roomEmitter)
    };
    const socket = { join: jest.fn(), leave: jest.fn() };
    const socketsByUser = new Map([['user-2', 'socket-2']]);
    const ws = new WebSocketEnhancements(io);

    ws.use(jest.fn());
    expect(io.use).toHaveBeenCalled();
    expect(ws.joinRoom(socket, 'room-1')).toBe('room-1');
    expect(ws.leaveRoom(socket, 'room-1')).toBe('room-1');

    ws.broadcast('room-1', 'message', { text: 'hello' });
    expect(io.to).toHaveBeenCalledWith('room-1');
    expect(roomEmitter.emit).toHaveBeenCalledWith('message', { text: 'hello' });
    expect(ws.getHistory('room-1')).toHaveLength(1);

    expect(ws.privateMessage(socketsByUser, 'user-2', 'dm', { text: 'secret' })).toBe(true);
    expect(ws.privateMessage(socketsByUser, 'missing', 'dm', {})).toBe(false);
    expect(ws.setPresence('user-1', 'away')).toEqual(expect.objectContaining({
      userId: 'user-1',
      status: 'away'
    }));
    expect(ws.getPresence('missing')).toEqual({ userId: 'missing', status: 'offline' });
  });
});
