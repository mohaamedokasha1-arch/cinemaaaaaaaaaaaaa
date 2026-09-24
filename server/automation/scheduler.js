/**
 * ⏰ Intelligent Sync Scheduler - جدولة المزامنة الذكية
 * Bull Queue / Celery + Redis simulation with in-memory queue
 */

import logger from '../utils/logger.js';

class JobQueue {
  constructor() {
    this.jobs = [];
    this.workers = new Map();
    this.running = new Map();
  }

  add(job) {
    const jobWithId = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...job,
      status: 'pending',
      attempts: 0,
      max_attempts: job.max_attempts || 3,
      created_at: new Date().toISOString()
    };
    this.jobs.push(jobWithId);
    logger.info('Scheduler', `📥 Job queued: ${job.type} (${jobWithId.id})`);
    this.processNext();
    return jobWithId;
  }

  async processNext() {
    const pending = this.jobs.filter(j => j.status === 'pending').sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });

    if (pending.length === 0) return;

    for (const job of pending.slice(0, 2)) { // Max 2 concurrent
      if (this.running.size >= 3) break; // Max 3 running
      if (this.running.has(job.id)) continue;

      const worker = this.workers.get(job.type);
      if (!worker) {
        logger.warn('Scheduler', `No worker for job type: ${job.type}`);
        continue;
      }

      job.status = 'running';
      job.started_at = new Date().toISOString();
      job.attempts++;
      this.running.set(job.id, job);

      logger.info('Scheduler', `⚙️ Running job: ${job.type} (${job.id}) attempt ${job.attempts}`);

      // Run async
      worker(job)
        .then(result => {
          job.status = 'completed';
          job.result = result;
          job.completed_at = new Date().toISOString();
          logger.success('Scheduler', `✅ Job completed: ${job.type} (${job.id})`);
        })
        .catch(error => {
          logger.error('Scheduler', `❌ Job failed: ${job.type} (${job.id}) - ${error.message}`);
          if (job.attempts < job.max_attempts) {
            job.status = 'pending';
            // Exponential backoff
            const delay = Math.pow(2, job.attempts) * 1000;
            setTimeout(() => this.processNext(), delay);
          } else {
            job.status = 'failed';
            job.error = error.message;
          }
        })
        .finally(() => {
          this.running.delete(job.id);
          setTimeout(() => this.processNext(), 500);
        });
    }
  }

  registerWorker(type, fn) {
    this.workers.set(type, fn);
    logger.info('Scheduler', `👷 Worker registered for: ${type}`);
  }

  getJobs(limit = 50) {
    return [...this.jobs].reverse().slice(0, limit);
  }

  getStats() {
    return {
      pending: this.jobs.filter(j => j.status === 'pending').length,
      running: this.jobs.filter(j => j.status === 'running').length,
      completed: this.jobs.filter(j => j.status === 'completed').length,
      failed: this.jobs.filter(j => j.status === 'failed').length,
      total: this.jobs.length
    };
  }
}

class IntelligentSyncScheduler {
  constructor(db, automationEngine) {
    this.db = db;
    this.engine = automationEngine;
    this.queue = new JobQueue();
    this.cronJobs = new Map();
    this.isRunning = false;
  }

  init() {
    // Register workers
    this.queue.registerWorker('new_movies_check', async (job) => {
      const aggResult = await this.engine.runAggregator({ limit: job.payload?.limit || 20 });
      
      // For each new movie, trigger embed fetching and full workflow
      if (aggResult.added && aggResult.added.length > 0) {
        for (const movie of aggResult.added.slice(0, 10)) {
          this.queue.add({
            type: 'fetch_embeds_for_movie',
            priority: 'HIGH',
            payload: { movie_id: movie.id }
          });
          // Small delay
          await new Promise(r => setTimeout(r, 200));
        }
      }
      
      return aggResult;
    });

    this.queue.registerWorker('update_existing', async (job) => {
      return await this.engine.runUpdateExisting();
    });

    this.queue.registerWorker('validate_embeds', async (job) => {
      return await this.engine.runEmbedValidation();
    });

    this.queue.registerWorker('trending_update', async (job) => {
      return await this.engine.runTrendingUpdate();
    });

    this.queue.registerWorker('arabic_dub_check', async (job) => {
      return await this.engine.runArabicDubCheck();
    });

    this.queue.registerWorker('cleanup', async (job) => {
      return await this.engine.runCleanup();
    });

    this.queue.registerWorker('fetch_embeds_for_movie', async (job) => {
      const { movie_id } = job.payload;
      return await this.engine.fetchEmbedsForMovie(movie_id);
    });

    logger.info('Scheduler', '✅ Scheduler initialized with workers');

    // Setup cron jobs
    this.setupCronJobs();

    this.isRunning = true;
  }

  setupCronJobs() {
    // Job 1: NewMoviesCheck - كل 3 ساعات
    this.scheduleCron('new_movies', '0 */3 * * *', () => {
      this.queue.add({
        type: 'new_movies_check',
        priority: 'HIGH',
        payload: { limit: 30 },
        schedule: 'every 3 hours'
      });
    }, 3 * 60 * 60 * 1000); // For demo: 3 hours = 3*3600000, but use 5 min for testing

    // Job 2: UpdateExistingMovies - يومياً 2 صباحاً
    this.scheduleCron('update_existing', '0 2 * * *', () => {
      this.queue.add({
        type: 'update_existing',
        priority: 'MEDIUM',
        payload: { batch_size: 100 },
        schedule: 'daily 2 AM'
      });
    }, 24 * 60 * 60 * 1000);

    // Job 3: ValidateEmbedLinks - كل 8 ساعات
    this.scheduleCron('validate_embeds', '0 */8 * * *', () => {
      this.queue.add({
        type: 'validate_embeds',
        priority: 'HIGH',
        payload: {},
        schedule: 'every 8 hours'
      });
    }, 8 * 60 * 60 * 1000);

    // Job 4: TrendingMoviesUpdate - كل ساعة
    this.scheduleCron('trending', '0 * * * *', () => {
      this.queue.add({
        type: 'trending_update',
        priority: 'MEDIUM',
        payload: {},
        schedule: 'hourly'
      });
    }, 60 * 60 * 1000);

    // Job 5: ArabicDubbingCheck - مرتين يومياً
    this.scheduleCron('arabic_dub', '0 6,18 * * *', () => {
      this.queue.add({
        type: 'arabic_dub_check',
        priority: 'MEDIUM',
        payload: {},
        schedule: 'twice daily'
      });
    }, 12 * 60 * 60 * 1000);

    // Job 6: CleanupJob - أسبوعياً
    this.scheduleCron('cleanup', '0 4 * * 0', () => {
      this.queue.add({
        type: 'cleanup',
        priority: 'LOW',
        payload: {},
        schedule: 'weekly'
      });
    }, 7 * 24 * 60 * 60 * 1000);

    logger.info('Scheduler', '⏰ Cron jobs scheduled: 6 jobs');
  }

  scheduleCron(name, cronExpression, callback, intervalMs) {
    // Simplified cron - use setInterval for demo
    // In production: use node-cron package
    const interval = setInterval(() => {
      logger.info('Scheduler', `⏰ Cron triggered: ${name} (${cronExpression})`);
      try {
        callback();
      } catch (e) {
        logger.error('Scheduler', `Cron ${name} failed: ${e.message}`);
      }
    }, intervalMs);

    this.cronJobs.set(name, {
      cron: cronExpression,
      interval,
      intervalMs,
      last_run: null,
      next_run: new Date(Date.now() + intervalMs).toISOString()
    });

    // For demo, trigger first run after 10 seconds for new_movies
    if (name === 'new_movies') {
      setTimeout(() => {
        logger.info('Scheduler', '🚀 Initial new_movies check (demo mode)');
        callback();
      }, 10000);
    }
  }

  // Manual triggers
  triggerNewMoviesCheck(limit = 20) {
    return this.queue.add({
      type: 'new_movies_check',
      priority: 'HIGH',
      payload: { limit, manual: true }
    });
  }

  triggerEmbedValidation() {
    return this.queue.add({
      type: 'validate_embeds',
      priority: 'HIGH',
      payload: { manual: true }
    });
  }

  triggerTrendingUpdate() {
    return this.queue.add({
      type: 'trending_update',
      priority: 'MEDIUM',
      payload: { manual: true }
    });
  }

  triggerArabicDubCheck() {
    return this.queue.add({
      type: 'arabic_dub_check',
      priority: 'MEDIUM',
      payload: { manual: true }
    });
  }

  triggerFetchEmbeds(movieId) {
    return this.queue.add({
      type: 'fetch_embeds_for_movie',
      priority: 'HIGH',
      payload: { movie_id: movieId, manual: true }
    });
  }

  getStatus() {
    return {
      is_running: this.isRunning,
      queue_stats: this.queue.getStats(),
      cron_jobs: Array.from(this.cronJobs.entries()).map(([name, job]) => ({
        name,
        cron: job.cron,
        interval_ms: job.intervalMs,
        next_run: job.next_run
      })),
      recent_jobs: this.queue.getJobs(10)
    };
  }

  stop() {
    for (const [name, job] of this.cronJobs) {
      clearInterval(job.interval);
    }
    this.cronJobs.clear();
    this.isRunning = false;
    logger.info('Scheduler', '🛑 Scheduler stopped');
  }
}

export default IntelligentSyncScheduler;
