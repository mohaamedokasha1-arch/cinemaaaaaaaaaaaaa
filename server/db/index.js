/**
 * 🗄️ Database Layer - طبقة قاعدة البيانات
 * تحاكي PostgreSQL/MongoDB باستخدام JSON files مع cache في الذاكرة
 * متوافق مع تصميم المخطط الهندسي
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMovieModel, createServerModel, createSyncLogModel } from './schema.js';
import { sampleMovies } from '../../src/data/sampleMovies.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const MOVIES_FILE = path.join(DATA_DIR, 'movies.json');
const SERVERS_FILE = path.join(DATA_DIR, 'servers.json');
const LOGS_FILE = path.join(DATA_DIR, 'sync_logs.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

class Database {
  constructor() {
    this.movies = [];
    this.servers = [];
    this.logs = [];
    this.stats = {
      total_views: 0,
      total_movies: 0,
      last_sync: null,
      uptime_start: new Date().toISOString()
    };
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Ensure data dir
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Load or initialize movies
    this.movies = this.loadFile(MOVIES_FILE, () => {
      // Convert sampleMovies to full model
      return sampleMovies.map((m, idx) => createMovieModel({
        ...m,
        tmdb_id: 100000 + idx,
        imdb_id: `tt${1000000 + idx}`,
        status: 'published',
        has_arabic_subs: Math.random() > 0.3,
        has_arabic_dub: Math.random() > 0.7,
        is_trending: idx < 3,
        is_new: idx < 5,
        view_count: Math.floor(Math.random() * 5000),
        tmdb_rating: parseFloat(m.rating) || 7.5,
        genres: [m.category],
        cast: [{ name: 'ممثل رئيسي', character: 'البطل' }],
        director: 'مخرج مميز'
      }));
    });

    // Load or init servers
    this.servers = this.loadFile(SERVERS_FILE, () => {
      // Generate initial servers for each movie
      const servers = [];
      for (const movie of this.movies) {
        const tmdbId = movie.tmdb_id;
        servers.push(
          createServerModel({
            movie_id: movie.id,
            server_name: 'VidSrc',
            embed_url: `https://vidsrc.to/embed/movie/${tmdbId}`,
            quality: '1080p',
            language: 'multi',
            has_arabic_subs: true,
            priority: 1,
            is_verified: true,
            response_time_ms: 320
          }),
          createServerModel({
            movie_id: movie.id,
            server_name: '2Embed',
            embed_url: `https://www.2embed.to/embed/tmdb/movie?id=${tmdbId}`,
            quality: 'HD',
            language: 'multi',
            has_arabic_subs: true,
            priority: 2,
            is_verified: true,
            response_time_ms: 450
          }),
          createServerModel({
            movie_id: movie.id,
            server_name: movie.has_arabic_dub ? 'Akwam (دبلجة عربية)' : 'VidLink Pro',
            embed_url: movie.has_arabic_dub ? `https://akwam.to/watch/${movie.id}` : `https://vidlink.pro/movie/${tmdbId}`,
            quality: 'HD',
            language: movie.has_arabic_dub ? 'ar' : 'multi',
            has_arabic_dub: movie.has_arabic_dub,
            has_arabic_subs: true,
            priority: movie.has_arabic_dub ? 1 : 3,
            is_verified: true,
            response_time_ms: movie.has_arabic_dub ? 280 : 380
          })
        );
      }
      return servers;
    });

    this.logs = this.loadFile(LOGS_FILE, () => []);
    this.stats = this.loadFile(STATS_FILE, () => ({
      total_views: this.movies.reduce((s, m) => s + (m.view_count || 0), 0),
      total_movies: this.movies.length,
      last_sync: new Date().toISOString(),
      uptime_start: new Date().toISOString()
    }));

    this.initialized = true;
    console.log(`📚 Database initialized: ${this.movies.length} movies, ${this.servers.length} servers`);
  }

  loadFile(filePath, defaultFactory) {
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return Array.isArray(data) || typeof data === 'object' ? data : defaultFactory();
      }
    } catch (e) {
      console.warn(`⚠️ Failed to load ${filePath}:`, e.message);
    }
    const defaultData = defaultFactory();
    this.saveFile(filePath, defaultData);
    return defaultData;
  }

  saveFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`❌ Failed to save ${filePath}:`, e.message);
    }
  }

  persist() {
    this.saveFile(MOVIES_FILE, this.movies);
    this.saveFile(SERVERS_FILE, this.servers);
    this.saveFile(LOGS_FILE, this.logs.slice(-100)); // Keep last 100 logs
    this.saveFile(STATS_FILE, this.stats);
  }

  // ===== Movies =====
  getMovies(filters = {}) {
    let result = [...this.movies];

    if (filters.status) {
      result = result.filter(m => m.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(m => 
        `${m.title} ${m.title_ar} ${m.titleAr} ${m.category} ${m.description}`.toLowerCase().includes(q)
      );
    }
    if (filters.category && filters.category !== 'الكل') {
      result = result.filter(m => m.category === filters.category || m.genres?.includes(filters.category));
    }
    if (filters.type && filters.type !== 'all') {
      result = result.filter(m => filters.type === 'favorites' ? false : m.type === filters.type);
    }
    if (filters.has_arabic_dub) {
      result = result.filter(m => m.has_arabic_dub);
    }
    if (filters.is_trending) {
      result = result.filter(m => m.is_trending);
    }
    if (filters.is_new) {
      result = result.filter(m => m.is_new);
    }

    // Sorting
    if (filters.sortBy === 'rating') {
      result.sort((a, b) => (b.tmdb_rating || 0) - (a.tmdb_rating || 0));
    } else if (filters.sortBy === 'newest') {
      result.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (filters.sortBy === 'views') {
      result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }

  getMovieById(id) {
    return this.movies.find(m => m.id === id || m.tmdb_id === parseInt(id) || m.slug === id);
  }

  getMovieByTmdbId(tmdbId) {
    return this.movies.find(m => m.tmdb_id === parseInt(tmdbId));
  }

  addMovie(data) {
    const movie = createMovieModel(data);
    // Duplicate check
    if (movie.tmdb_id && this.getMovieByTmdbId(movie.tmdb_id)) {
      return { success: false, error: 'الفيلم موجود مسبقاً', duplicate: true };
    }
    this.movies.unshift(movie);
    this.stats.total_movies = this.movies.length;
    this.persist();
    return { success: true, movie };
  }

  updateMovie(id, changes) {
    const idx = this.movies.findIndex(m => m.id === id);
    if (idx === -1) return { success: false, error: 'غير موجود' };
    this.movies[idx] = { ...this.movies[idx], ...changes, updated_at: new Date().toISOString() };
    this.persist();
    return { success: true, movie: this.movies[idx] };
  }

  deleteMovie(id) {
    const before = this.movies.length;
    this.movies = this.movies.filter(m => m.id !== id);
    this.servers = this.servers.filter(s => s.movie_id !== id);
    this.stats.total_movies = this.movies.length;
    this.persist();
    return { success: this.movies.length < before };
  }

  incrementView(id) {
    const movie = this.getMovieById(id);
    if (movie) {
      movie.view_count = (movie.view_count || 0) + 1;
      this.stats.total_views++;
      this.persist();
    }
  }

  // ===== Servers =====
  getServersByMovieId(movieId) {
    return this.servers
      .filter(s => s.movie_id === movieId && s.is_active)
      .sort((a, b) => {
        // أولوية للمحتوى العربي المدبلج
        if (a.has_arabic_dub && !b.has_arabic_dub) return -1;
        if (!a.has_arabic_dub && b.has_arabic_dub) return 1;
        if (a.has_arabic_subs && !b.has_arabic_subs) return -1;
        if (!a.has_arabic_subs && b.has_arabic_subs) return 1;
        return a.priority - b.priority;
      });
  }

  addServer(data) {
    const server = createServerModel(data);
    this.servers.push(server);
    this.persist();
    return server;
  }

  updateServer(id, changes) {
    const idx = this.servers.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.servers[idx] = { ...this.servers[idx], ...changes, updated_at: new Date().toISOString() };
    this.persist();
    return this.servers[idx];
  }

  validateServer(id, isActive, responseTime) {
    const server = this.servers.find(s => s.id === id);
    if (server) {
      server.is_active = isActive;
      server.last_checked = new Date().toISOString();
      if (isActive) {
        server.last_online = new Date().toISOString();
        server.failed_checks = 0;
        server.response_time_ms = responseTime || server.response_time_ms;
      } else {
        server.failed_checks = (server.failed_checks || 0) + 1;
      }
      this.persist();
    }
    return server;
  }

  // ===== Logs =====
  addLog(logData) {
    const log = createSyncLogModel(logData);
    this.logs.push(log);
    if (this.logs.length > 200) this.logs = this.logs.slice(-200);
    this.persist();
    return log;
  }

  updateLog(id, changes) {
    const log = this.logs.find(l => l.id === id);
    if (log) {
      Object.assign(log, changes);
      if (changes.status === 'success' || changes.status === 'failed') {
        log.end_time = new Date().toISOString();
        log.execution_time_ms = new Date(log.end_time) - new Date(log.start_time);
      }
      this.persist();
    }
    return log;
  }

  getLogs(limit = 50) {
    return [...this.logs].reverse().slice(0, limit);
  }

  // ===== Stats & Monitoring =====
  getStats() {
    const now = new Date();
    const activeServers = this.servers.filter(s => s.is_active).length;
    const arabicDub = this.movies.filter(m => m.has_arabic_dub).length;
    const arabicSubs = this.movies.filter(m => m.has_arabic_subs).length;
    
    return {
      ...this.stats,
      total_movies: this.movies.length,
      total_servers: this.servers.length,
      active_servers: activeServers,
      inactive_servers: this.servers.length - activeServers,
      arabic_dub_count: arabicDub,
      arabic_subs_count: arabicSubs,
      trending_count: this.movies.filter(m => m.is_trending).length,
      new_count: this.movies.filter(m => m.is_new).length,
      uptime: Math.floor((now - new Date(this.stats.uptime_start)) / 1000),
      last_sync: this.stats.last_sync,
      categories: [...new Set(this.movies.map(m => m.category))],
      top_movies: this.movies.sort((a, b) => b.view_count - a.view_count).slice(0, 5).map(m => ({
        id: m.id,
        title: m.title_ar || m.titleAr,
        views: m.view_count
      }))
    };
  }

  searchMovies(query, options = {}) {
    return this.getMovies({ search: query, ...options });
  }
}

// Singleton
const db = new Database();
export default db;
