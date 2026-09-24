import express from 'express';
const router = express.Router();

export default function healthRoutes(db) {
  router.get('/', (req, res) => {
    const stats = db.getStats();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: stats.uptime,
      version: '2.0.0',
      service: 'Cinema Al Arab - Full Automation',
      database: {
        movies: stats.total_movies,
        servers: stats.total_servers,
        active_servers: stats.active_servers
      },
      memory: process.memoryUsage(),
      node: process.version
    });
  });

  router.get('/ready', (req, res) => {
    res.json({ ready: true, timestamp: new Date().toISOString() });
  });

  router.get('/live', (req, res) => {
    res.json({ alive: true, timestamp: new Date().toISOString() });
  });

  return router;
}
