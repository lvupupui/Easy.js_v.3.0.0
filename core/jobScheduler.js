const cron = require('node-cron');
const { Queue, Worker } = require('bullmq');
const loggerWinston = require('./loggerWinston');

class JobScheduler {
  constructor(redisUrl = 'redis://localhost:6379') {
    this.jobs = new Map();
    this.queues = new Map();
    this.workers = new Map();
    this.redisUrl = redisUrl;
    this.nextJobId = 1;
    this.redisConnection = this.parseRedisUrl(redisUrl);
  }

  parseRedisUrl(redisUrl) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      db: url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : 0
    };
  }

  /**
   * Schedule a cron job
   * @param {string} name - Job name
   * @param {string} expression - Cron expression (e.g. "0 0 * * *")
   * @param {Function} callback - Job function
   * @param {Object} options - Options
   */
  scheduleJob(name, expression, callback, options = {}) {
    try {
      const job = cron.schedule(expression, async () => {
        try {
          loggerWinston.info(`[CRON] Starting job: ${name}`);
          const startTime = Date.now();
          
          await callback();
          
          const duration = Date.now() - startTime;
          loggerWinston.info(`[CRON] Completed job: ${name}`, { duration: `${duration}ms` });
        } catch (error) {
          loggerWinston.error(`[CRON] Failed job: ${name}`, { error: error.message });
          if (options.onError) {
            options.onError(error);
          }
        }
      }, { runOnInit: options.runOnInit || false });

      this.jobs.set(name, job);
      loggerWinston.info(`[CRON] Job scheduled: ${name} (${expression})`);
      
      return job;
    } catch (error) {
      loggerWinston.error(`Failed to schedule job: ${name}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Schedule a one-time job
   * @param {string} name - Job name
   * @param {number} delay - Delay in milliseconds
   * @param {Function} callback - Job function
   */
  scheduleOnce(name, delay, callback) {
    const timeout = setTimeout(async () => {
      try {
        loggerWinston.info(`[ONCE] Starting job: ${name}`);
        await callback();
        loggerWinston.info(`[ONCE] Completed job: ${name}`);
      } catch (error) {
        loggerWinston.error(`[ONCE] Failed job: ${name}`, { error: error.message });
      }
    }, delay);

    const job = { stop: () => clearTimeout(timeout) };
    this.jobs.set(name, job);

    return job;
  }

  /**
   * Queue a job with retry logic
   * @param {string} queueName - Queue name
   * @param {string} jobName - Job name
   * @param {Object} data - Job data
   * @param {Object} options - Options
   */
  async queueJob(queueName, jobName, data = {}, options = {}) {
    try {
      if (!this.queues.has(queueName)) {
        this.queues.set(queueName, new Queue(queueName, { connection: this.redisConnection }));
      }

      const queue = this.queues.get(queueName);
      const job = await queue.add(jobName, data, {
        attempts: options.retries || 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false,
        ...options
      });

      loggerWinston.info(`[QUEUE] Job queued: ${jobName}`, { jobId: job.id, queueName });
      
      return job;
    } catch (error) {
      loggerWinston.error(`Failed to queue job: ${jobName}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Process jobs from a queue
   * @param {string} queueName - Queue name
   * @param {Function} processor - Job processor function
   */
  async processQueue(queueName, processor) {
    try {
      if (!this.queues.has(queueName)) {
        this.queues.set(queueName, new Queue(queueName, { connection: this.redisConnection }));
      }

      if (this.workers.has(queueName)) {
        await this.workers.get(queueName).close();
      }

      const worker = new Worker(queueName, async (job) => {
        try {
          loggerWinston.info(`[QUEUE] Processing: ${job.name} (ID: ${job.id})`);
          const result = await processor(job.data);
          return result;
        } catch (error) {
          loggerWinston.error(`[QUEUE] Processing failed: ${job.name}`, { error: error.message });
          throw error;
        }
      }, { connection: this.redisConnection });

      worker.on('completed', (job) => {
        loggerWinston.info(`[QUEUE] Job completed: ${job.name} (ID: ${job.id})`);
      });

      worker.on('failed', (job, err) => {
        loggerWinston.error(`[QUEUE] Job failed: ${job.name}`, { 
          jobId: job.id, 
          error: err.message,
          attempts: job.attemptsMade
        });
      });

      this.workers.set(queueName, worker);
      loggerWinston.info(`[QUEUE] Processing started for queue: ${queueName}`);
    } catch (error) {
      loggerWinston.error(`Failed to setup queue processor: ${queueName}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName, jobId) {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) return null;

      const job = await queue.getJob(jobId);
      if (!job) return null;

      const state = await job.getState();
      const progress = job.progress;

      return { state, progress, data: job.data };
    } catch (error) {
      loggerWinston.error('Failed to get job status', { error: error.message });
      throw error;
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(queueName, jobId) {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) return false;

      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        loggerWinston.info(`[QUEUE] Job cancelled: ${jobId}`);
        return true;
      }
      return false;
    } catch (error) {
      loggerWinston.error('Failed to cancel job', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop a scheduled job
   */
  stopJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      if (job.stop) job.stop();
      this.jobs.delete(name);
      loggerWinston.info(`[CRON] Job stopped: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs() {
    return Array.from(this.jobs.keys());
  }

  /**
   * Close all queues
   */
  async closeQueues() {
    try {
      for (const [name, queue] of this.queues) {
        await queue.close();
        loggerWinston.info(`[QUEUE] Queue closed: ${name}`);
      }
      for (const [name, worker] of this.workers) {
        await worker.close();
        loggerWinston.info(`[QUEUE] Worker closed: ${name}`);
      }
    } catch (error) {
      loggerWinston.error('Failed to close queues', { error: error.message });
    }
  }
}

// Common cron expressions
JobScheduler.CRON_EVERY_MINUTE = '* * * * *';
JobScheduler.CRON_EVERY_5_MINUTES = '*/5 * * * *';
JobScheduler.CRON_EVERY_HOUR = '0 * * * *';
JobScheduler.CRON_DAILY_AT_MIDNIGHT = '0 0 * * *';
JobScheduler.CRON_DAILY_AT_NOON = '0 12 * * *';
JobScheduler.CRON_WEEKLY_MONDAY = '0 0 * * 1';
JobScheduler.CRON_MONTHLY = '0 0 1 * *';

module.exports = JobScheduler;
