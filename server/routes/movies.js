/**
 * 🎬 Movies API Routes
 */

import express from 'express';
const router = express.Router();

export default function moviesRoutes(db, automationEngine) {
  // GET /api/movies - List with filters
  router.get('/', (req, res) => {
    try {
      const {
        search, category, type, sortBy,
        status, has_arabic_dub, is_trending, is_new,
        page = 1, limit = 24
      } = req.query;

      const filters = {
        search,
        category,
        type,
        sortBy,
        status: status || null, // Show all statuses by default (published + pending_embed + etc) for full catalog
        has_arabic_dub: has_arabic_dub === 'true',
        is_trending: is_trending === 'true',
        is_new: is_new === 'true'
      };

      // Remove empty filters
      Object.keys(filters).forEach(k => {
        if (filters[k] === undefined || filters[k] === '' || filters[k] === null || filters[k] === false) {
          if (k !== 'has_arabic_dub' && k !== 'is_trending' && k !== 'is_new') {
            delete filters[k];
          } else {
            delete filters[k]; // Also remove false booleans to show all
          }
        }
      });

      // If status is explicitly requested, keep it, otherwise show all except archived/draft for public
      if (!filters.status && !status) {
        // For public API, show published + pending_embed + pending as visible
        // Don't filter by status to show full automation results
      }

      let movies = db.getMovies(filters);

      // Pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const total = movies.length;
      const totalPages = Math.ceil(total / limitNum);
      const start = (pageNum - 1) * limitNum;
      const paginated = movies.slice(start, start + limitNum);

      res.json({
        success: true,
        data: paginated,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        filters
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/movies/:id - Single movie with servers
  router.get('/:id', (req, res) => {
    try {
      const movie = db.getMovieById(req.params.id);
      if (!movie) {
        return res.status(404).json({ success: false, error: 'الفيلم غير موجود' });
      }

      // Increment view count
      db.incrementView(movie.id);

      const servers = db.getServersByMovieId(movie.id);

      res.json({
        success: true,
        data: {
          ...movie,
          servers,
          servers_count: servers.length,
          has_arabic_dub: servers.some(s => s.has_arabic_dub) || movie.has_arabic_dub,
          has_arabic_subs: servers.some(s => s.has_arabic_subs) || movie.has_arabic_subs
        }
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/movies/:id/servers - Only servers
  router.get('/:id/servers', (req, res) => {
    try {
      const movie = db.getMovieById(req.params.id);
      if (!movie) {
        return res.status(404).json({ success: false, error: 'الفيلم غير موجود' });
      }

      const servers = db.getServersByMovieId(movie.id);

      res.json({
        success: true,
        movie_id: movie.id,
        movie_title: movie.title_ar || movie.titleAr,
        total: servers.length,
        data: servers
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/movies - Add new movie (admin)
  router.post('/', (req, res) => {
    try {
      const result = db.addMovie(req.body);
      if (!result.success) {
        return res.status(400).json(result);
      }

      // Trigger embed fetching async
      if (automationEngine) {
        setTimeout(() => {
          automationEngine.fetchEmbedsForMovie(result.movie.id).catch(console.error);
        }, 1000);
      }

      res.status(201).json({
        success: true,
        data: result.movie,
        message: 'تمت إضافة الفيلم بنجاح'
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // PUT /api/movies/:id - Update movie
  router.put('/:id', (req, res) => {
    try {
      const result = db.updateMovie(req.params.id, req.body);
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json({
        success: true,
        data: result.movie,
        message: 'تم تحديث الفيلم'
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // DELETE /api/movies/:id
  router.delete('/:id', (req, res) => {
    try {
      const result = db.deleteMovie(req.params.id);
      if (!result.success) {
        return res.status(404).json({ success: false, error: 'الفيلم غير موجود' });
      }

      res.json({
        success: true,
        message: 'تم حذف الفيلم'
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // POST /api/movies/:id/view - Increment view
  router.post('/:id/view', (req, res) => {
    try {
      db.incrementView(req.params.id);
      res.json({ success: true, message: 'View counted' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // GET /api/movies/genres/list
  router.get('/genres/list', (req, res) => {
    try {
      const stats = db.getStats();
      res.json({
        success: true,
        data: stats.categories
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}
