jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

jest.mock('bullmq', () => {
  const queueInstances = [];
  const workerInstances = [];

  class Queue {
    constructor(name, options) {
      this.name = name;
      this.options = options;
      this.add = jest.fn().mockResolvedValue({ id: 'job-1', name: 'send', data: {} });
      this.getJob = jest.fn();
      this.close = jest.fn().mockResolvedValue();
      queueInstances.push(this);
    }
  }

  class Worker {
    constructor(name, processor, options) {
      this.name = name;
      this.processor = processor;
      this.options = options;
      this.on = jest.fn();
      this.close = jest.fn().mockResolvedValue();
      workerInstances.push(this);
    }
  }

  return { Queue, Worker, queueInstances, workerInstances };
});

const cron = require('node-cron');
const bullmq = require('bullmq');
const JobScheduler = require('../../core/jobScheduler');

describe('JobScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bullmq.queueInstances.length = 0;
    bullmq.workerInstances.length = 0;
  });

  it('parses Redis URLs and schedules/stops cron jobs', () => {
    const scheduledJob = { stop: jest.fn() };
    cron.schedule.mockReturnValue(scheduledJob);
    const scheduler = new JobScheduler('redis://user:pass@localhost:6380/2');

    expect(scheduler.redisConnection).toEqual({
      host: 'localhost',
      port: 6380,
      username: 'user',
      password: 'pass',
      db: 2
    });

    const callback = jest.fn();
    const job = scheduler.scheduleJob('cleanup', '* * * * *', callback, { runOnInit: true });

    expect(job).toBe(scheduledJob);
    expect(cron.schedule).toHaveBeenCalledWith('* * * * *', expect.any(Function), { runOnInit: true });
    expect(scheduler.getScheduledJobs()).toEqual(['cleanup']);
    expect(scheduler.stopJob('cleanup')).toBe(true);
    expect(scheduledJob.stop).toHaveBeenCalled();
    expect(scheduler.stopJob('missing')).toBe(false);
  });

  it('executes cron callbacks and forwards cron errors', async () => {
    const scheduledJob = { stop: jest.fn() };
    let cronCallback;
    cron.schedule.mockImplementation((expression, callback) => {
      cronCallback = callback;
      return scheduledJob;
    });
    const scheduler = new JobScheduler();
    const callback = jest.fn().mockResolvedValue();
    const onError = jest.fn();

    scheduler.scheduleJob('sync', '* * * * *', callback, { onError });
    await cronCallback();
    expect(callback).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    callback.mockRejectedValueOnce(new Error('sync failed'));
    await cronCallback();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));

    cron.schedule.mockImplementationOnce(() => {
      throw new Error('bad cron');
    });
    expect(() => scheduler.scheduleJob('bad', '*', jest.fn())).toThrow('bad cron');
  });

  it('runs one-time jobs and supports cancellation', () => {
    jest.useFakeTimers();
    const scheduler = new JobScheduler();
    const callback = jest.fn().mockResolvedValue();

    scheduler.scheduleOnce('once', 1000, callback);
    jest.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalled();
    callback.mockRejectedValueOnce(new Error('once failed'));
    scheduler.scheduleOnce('once-fails', 1000, callback);
    jest.advanceTimersByTime(1000);
    scheduler.scheduleOnce('cancelled', 1000, callback).stop();
    jest.advanceTimersByTime(1000);
    jest.useRealTimers();
  });

  it('queues jobs, reports status, cancels jobs, and closes resources', async () => {
    const scheduler = new JobScheduler();

    const queued = await scheduler.queueJob('emails', 'send', { to: 'a@example.com' }, { retries: 5 });
    expect(queued.id).toBe('job-1');
    expect(bullmq.queueInstances[0].add).toHaveBeenCalledWith('send', { to: 'a@example.com' }, expect.objectContaining({
      attempts: 5,
      removeOnComplete: true
    }));

    const mockJob = {
      data: { to: 'a@example.com' },
      progress: 50,
      getState: jest.fn().mockResolvedValue('waiting'),
      remove: jest.fn().mockResolvedValue()
    };
    bullmq.queueInstances[0].getJob.mockResolvedValue(mockJob);

    await expect(scheduler.getJobStatus('emails', 'job-1')).resolves.toEqual({
      state: 'waiting',
      progress: 50,
      data: { to: 'a@example.com' }
    });
    await expect(scheduler.cancelJob('emails', 'job-1')).resolves.toBe(true);
    expect(mockJob.remove).toHaveBeenCalled();

    await scheduler.processQueue('emails', async data => ({ ok: data.to }));
    expect(bullmq.workerInstances[0].on).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(bullmq.workerInstances[0].on).toHaveBeenCalledWith('failed', expect.any(Function));
    await expect(bullmq.workerInstances[0].processor({ name: 'send', id: 'job-1', data: { to: 'a@example.com' } }))
      .resolves.toEqual({ ok: 'a@example.com' });
    await expect(bullmq.workerInstances[0].processor({ name: 'send', id: 'job-2', data: {} }))
      .resolves.toEqual({ ok: undefined });
    const completedHandler = bullmq.workerInstances[0].on.mock.calls.find(call => call[0] === 'completed')[1];
    const failedHandler = bullmq.workerInstances[0].on.mock.calls.find(call => call[0] === 'failed')[1];
    completedHandler({ name: 'send', id: 'job-1' });
    failedHandler({ name: 'send', id: 'job-2', attemptsMade: 2 }, new Error('failed'));

    await scheduler.processQueue('emails', async () => 'again');
    expect(bullmq.workerInstances[0].close).toHaveBeenCalled();

    await scheduler.closeQueues();
    expect(bullmq.queueInstances[0].close).toHaveBeenCalled();
    expect(bullmq.workerInstances[1].close).toHaveBeenCalled();
  });

  it('returns null/false for unknown queued jobs', async () => {
    const scheduler = new JobScheduler();

    await expect(scheduler.getJobStatus('missing', 'job')).resolves.toBeNull();
    await expect(scheduler.cancelJob('missing', 'job')).resolves.toBe(false);

    await scheduler.queueJob('emails', 'send', {});
    bullmq.queueInstances[0].getJob.mockResolvedValue(null);
    await expect(scheduler.getJobStatus('emails', 'missing')).resolves.toBeNull();
    await expect(scheduler.cancelJob('emails', 'missing')).resolves.toBe(false);

    bullmq.queueInstances[0].getJob.mockRejectedValueOnce(new Error('status failed'));
    await expect(scheduler.getJobStatus('emails', 'job')).rejects.toThrow('status failed');
    bullmq.queueInstances[0].getJob.mockRejectedValueOnce(new Error('cancel failed'));
    await expect(scheduler.cancelJob('emails', 'job')).rejects.toThrow('cancel failed');
  });

  it('surfaces queueing, processing setup, and close failures', async () => {
    const scheduler = new JobScheduler();
    await scheduler.queueJob('emails', 'send', {});
    bullmq.queueInstances[0].add.mockRejectedValueOnce(new Error('queue failed'));
    await expect(scheduler.queueJob('emails', 'send', {})).rejects.toThrow('queue failed');

    const failing = new JobScheduler();
    await failing.queueJob('failing', 'seed', {});
    failing.workers.set('failing', { close: jest.fn().mockRejectedValue(new Error('close failed')) });
    await expect(failing.processQueue('failing', async () => null)).rejects.toThrow('close failed');

    scheduler.queues.set('bad-close', { close: jest.fn().mockRejectedValue(new Error('close failed')) });
    await expect(scheduler.closeQueues()).resolves.toBeUndefined();
  });
});
