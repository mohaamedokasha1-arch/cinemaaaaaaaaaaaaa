/**
 * 🤖 Automation API Routes - مسارات الأتمتة
 */

import express from 'express';
const router = express.Router();

export default function automationRoutes(db, automationEngine, scheduler) {
  // GET /api/automation/status - Overall status
  router.get('/status', (req, res) => {
    try {
      const status = automationEngine.getStatus();
      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/automation/stats - Detailed stats
  router.get('/stats', (req, res) => {
    try {
      const stats = db.getStats();
      const schedulerStatus = scheduler?.getStatus();

      res.json({
        success: true,
        data: {
          database: stats,
          scheduler: schedulerStatus,
          system: {
            uptime: stats.uptime,
            memory: process.memoryUsage(),
            node_version: process.version,
            env: process.env.NODE_ENV || 'development'
          }
        }
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/automation/logs
  router.get('/logs', (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const logs = db.getLogs(limit);

      res.json({
        success: true,
        data: logs,
        total: logs.length
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/automation/sync - Trigger full sync
  router.post('/sync', async (req, res) => {
    try {
      const { limit = 15, type = 'full' } = req.body;

      let job;
      if (type === 'full') {
        // Run full sync async
        const resultPromise = automationEngine.runFullSync({ limit });
        
        // Return immediately with job id
        res.json({
          success: true,
          message: 'بدأت عملية المزامنة الكاملة',
          job_type: 'full_sync',
          limit,
          status: 'running'
        });

        // Log completion later
        resultPromise.then(result => {
          console.log('✅ Full sync completed:', result);
        }).catch(e => {
          console.error('❌ Full sync failed:', e.message);
        });

      } else if (type === 'new_movies') {
        job = scheduler.triggerNewMoviesCheck(limit);
        res.json({
          success: true,
          message: 'بدأ فحص الأفلام الجديدة',
          job_id: job.id,
          job_type: 'new_movies_check'
        });
      } else {
        return res.status(400).json({ success: false, error: 'نوع مزامنة غير صحيح' });
      }

    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/automation/fetch-embed/:id
  router.post('/fetch-embed/:id', async (req, res) => {
    try {
      const movieId = req.params.id;
      const movie = db.getMovieById(movieId);

      if (!movie) {
        return res.status(404).json({ success: false, error: 'الفيلم غير موجود' });
      }

      const job = scheduler.triggerFetchEmbeds(movieId);

      res.json({
        success: true,
        message: `بدأ جلب السيرفرات لفيلم: ${movie.title_ar || movie.title}`,
        job_id: job.id,
        movie_id: movieId
      });

      // Also run directly for immediate response in background
      automationEngine.fetchEmbedsForMovie(movieId)
        .then(result => console.log(`✅ Embeds for ${movieId}: ${result.valid_count} valid`))
        .catch(e => console.error(`❌ Embed fetch failed for ${movieId}:`, e.message));

    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/automation/validate - Trigger validation
  router.post('/validate', async (req, res) => {
    try {
      const job = scheduler.triggerEmbedValidation();

      res.json({
        success: true,
        message: 'بدأ التحقق من صحة السيرفرات',
        job_id: job.id
      });

    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/automation/trending - Update trending
  router.post('/trending', async (req, res) => {
    try {
      const job = scheduler.triggerTrendingUpdate();

      res.json({
        success: true,
        message: 'بدأ تحديث الأفلام الرائجة',
        job_id: job.id
      });

    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/automation/arabic-dub - Check Arabic dubbing
  router.post('/arabic-dub', async (req, res) => {
    try {
      const job = scheduler.triggerArabicDubCheck();

      res.json({
        success: true,
        message: 'بدأ فحص الدبلجة العربية',
        job_id: job.id
      });

    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/automation/process/:id - Full workflow for single movie
  router.post('/process/:id', async (req, res) => {
    try {
      const movieId = req.params.id;
      const movie = db.getMovieById(movieId);

      if (!movie) {
        return res.status(404).json({ success: false, error: 'الفيلم غير موجود' });
      }

      res.json({
        success: true,
        message: `بدأت المعالجة الكاملة لفيلم: ${movie.title_ar}`,
        movie_id: movieId,
        status: 'running'
      });

      // Run in background
      automationEngine.processMovieFullWorkflow(movieId)
        .then(result => {
          console.log(`✅ Full workflow for ${movieId} completed:`, result.publish_result?.status);
        })
        .catch(e => {
          console.error(`❌ Workflow failed for ${movieId}:`, e.message);
        });

    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/automation/jobs - List jobs
  router.get('/jobs', (req, res) => {
    try {
      const jobs = scheduler?.queue?.getJobs(parseInt(req.query.limit) || 20) || [];
      const stats = scheduler?.queue?.getStats() || {};

      res.json({
        success: true,
        data: jobs,
        stats
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/automation/health - Health check for all APIs
  router.get('/health', async (req, res) => {
    try {
      const checks = {
        database: { status: 'ok', movies: db.movies.length, servers: db.servers.length },
        tmdb: { status: 'unknown', response_time: 0 },
        scheduler: { status: scheduler?.isRunning ? 'running' : 'stopped' },
        memory: process.memoryUsage()
      };

      // Check TMDB
      try {
        const start = Date.now();
        const { tmdbClient } = await import('../utils/tmdbClient.js');
        await tmdbClient.getTrending('day').then(() => {}).catch(() => {});
        checks.tmdb = {
          status: 'ok',
          response_time: Date.now() - start,
          api_key_configured: !!(process.env.TMDB_API_KEY)
        };
      } catch (e) {
        checks.tmdb = { status: 'error', error: e.message };
      }

      const allOk = checks.database.status === 'ok' && checks.scheduler.status === 'running';

      res.json({
        success: allOk,
        status: allOk ? 'healthy' : 'degraded',
        checks,
        timestamp: new Date().toISOString()
      });

    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}
