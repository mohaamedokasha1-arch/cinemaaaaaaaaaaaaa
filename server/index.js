/**
 * 🚀 Cinema Al Arab - Full Automation Server
 * Backend API Layer + Automation Engine + Static Frontend
 */

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load env
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PORT = process.env.PORT || 3000;

// Import core
import db from './db/index.js';
import AutomationEngine from './automation/index.js';
import IntelligentSyncScheduler from './automation/scheduler.js';

// Import routes
import moviesRoutes from './routes/movies.js';
import automationRoutes from './routes/automation.js';
import healthRoutes from './routes/health.js';

import logger from './utils/logger.js';

async function createServer() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (!req.path.startsWith('/assets/') && !req.path.match(/\.(js|css|png|jpg|svg)$/)) {
        console.log(`📡 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      }
    });
    next();
  });

  // Initialize DB and Automation
  console.log('🔧 Initializing database...');
  await db.init();

  console.log('🧠 Initializing automation engine...');
  const automationEngine = new AutomationEngine(db);
  await automationEngine.init();

  console.log('⏰ Initializing scheduler...');
  const scheduler = new IntelligentSyncScheduler(db, automationEngine);
  scheduler.init();
  automationEngine.setScheduler(scheduler);

  // API Routes
  app.use('/api/movies', moviesRoutes(db, automationEngine));
  app.use('/api/automation', automationRoutes(db, automationEngine, scheduler));
  app.use('/api/health', healthRoutes(db));

  // Additional API endpoints
  app.get('/api/stats', (req, res) => {
    res.json({
      success: true,
      data: db.getStats()
    });
  });

  app.get('/api/logs', (req, res) => {
    res.json({
      success: true,
      data: logger.getLogs(parseInt(req.query.limit) || 100)
    });
  });

  // Embed sources info (for frontend)
  app.get('/api/embed-sources', (req, res) => {
    res.json({
      success: true,
      data: [
        { name: 'VidSrc', url: 'https://vidsrc.to/embed/movie/{TMDB_ID}', quality: 'AUTO', hasArabicSubs: true, priority: 1 },
        { name: '2Embed', url: 'https://www.2embed.to/embed/tmdb/movie?id={ID}', quality: 'multi', hasArabicSubs: true, priority: 2 },
        { name: 'SuperEmbed', url: 'https://multiembed.mov/?video_id={TMDB_ID}', quality: 'HD', hasArabicSubs: true, priority: 3 },
        { name: 'VidLink Pro', url: 'https://vidlink.pro/movie/{TMDB_ID}', quality: 'HD', hasArabicSubs: true, priority: 3 },
        { name: 'Warezcdn', url: 'https://warezcdn.com/embed/{IMDB_ID}', quality: 'HD', hasArabicSubs: true, priority: 4 },
        { name: 'Akwam (دبلجة عربية)', url: 'Arabic scraping', quality: 'HD', hasArabicDub: true, priority: 1 },
        { name: 'CimaSala', url: 'Arabic scraping', quality: 'HD', hasArabicSubs: true, priority: 5 },
        { name: 'FaselHD', url: 'API reverse', quality: '1080p', hasArabicDub: true, priority: 2 }
      ]
    });
  });

  // Serve frontend static files if dist exists
  if (fs.existsSync(DIST_DIR)) {
    console.log(`📁 Serving frontend from: ${DIST_DIR}`);
    
    app.use(express.static(DIST_DIR, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));

    // SPA fallback - must be after API routes
    app.get('*', (req, res) => {
      // Don't fallback for API or assets
      if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return res.status(404).json({ success: false, error: 'Not found' });
      }
      
      const indexPath = path.join(DIST_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Frontend not built. Run npm run build');
      }
    });
  } else {
    console.log('⚠️ dist folder not found - running in API-only mode');
    console.log('💡 Run npm run build to build frontend');
    
    app.get('/', (req, res) => {
      res.json({
        message: '🎬 Cinema Al Arab - Full Automation API',
        version: '2.0.0',
        status: 'API only - frontend not built',
        endpoints: {
          movies: '/api/movies',
          automation: '/api/automation',
          health: '/api/health',
          stats: '/api/stats'
        },
        automation: {
          status: '/api/automation/status',
          sync: 'POST /api/automation/sync',
          logs: '/api/automation/logs'
        },
        build_frontend: 'npm run build'
      });
    });
  }

  // Error handler
  app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: err.message
    });
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('🛑 Shutting down...');
    scheduler.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return { app, db, automationEngine, scheduler };
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('server/index.js')) {
  createServer().then(({ app }) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
🎬 ===============================================
   سينما العرب - نظام التشغيل الآلي الكامل
   Cinema Al Arab - Full Automation System
   ===============================================
   
   🚀 Server running on: http://0.0.0.0:${PORT}
   📊 API: http://localhost:${PORT}/api
   🎥 Movies: http://localhost:${PORT}/api/movies
   🤖 Automation: http://localhost:${PORT}/api/automation/status
   💚 Health: http://localhost:${PORT}/api/health
   
   📚 Architecture:
   ✅ Frontend (React + Vite)
   ✅ Backend API (Express)
   ✅ Database (JSON + Memory Cache)
   ✅ Automation Engine (5 modules)
   ✅ Scheduler (6 cron jobs)
   
   🔧 Modules:
   1. ArabicMovieDataAggregator
   2. EmbedLinksFetcherPro
   3. IntelligentSyncScheduler
   4. AIContentValidator
   5. AutoPublishingSystem
   
   ===============================================
      `);
    });
  }).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default createServer;
