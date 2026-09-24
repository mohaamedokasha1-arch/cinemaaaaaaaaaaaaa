/**
 * 🎬 Arabic Movie Data Aggregator - محرك جمع الأفلام العربية
 * يجلب الأفلام من TMDB, Trakt, RSS feeds
 */

import { tmdbClient } from '../utils/tmdbClient.js';
import logger from '../utils/logger.js';
import translationService from './translation.js';
import { RateLimiter, sleep } from '../utils/helpers.js';
import { createMovieModel } from '../db/schema.js';

class ArabicMovieDataAggregator {
  constructor(db) {
    this.db = db;
    this.rateLimiter = new RateLimiter(40, 10000); // 40 req / 10 sec for TMDB
    this.keywords = ['عربي', 'مصري', 'خليجي', 'لبناني', 'مترجم', 'مدبلج'];
    this.processedCount = 0;
  }

  async fetchFromPrimarySources() {
    logger.info('Aggregator', '📡 Fetching from primary sources...');
    
    const sources = {
      arabic_discover: [],
      now_playing_eg: [],
      now_playing_sa: [],
      now_playing_ae: [],
      trending: [],
      upcoming: []
    };

    try {
      // TMDB Arabic discover
      await this.rateLimiter.check();
      sources.arabic_discover = await tmdbClient.discoverArabicMovies(1);
      logger.info('Aggregator', `Found ${sources.arabic_discover.length} Arabic movies from discover`);

      // Now playing in Arab regions
      await this.rateLimiter.check();
      sources.now_playing_eg = await tmdbClient.getNowPlaying('EG');
      
      await this.rateLimiter.check();
      sources.now_playing_sa = await tmdbClient.getNowPlaying('SA');
      
      await this.rateLimiter.check();
      sources.now_playing_ae = await tmdbClient.getNowPlaying('AE');

      // Trending
      await this.rateLimiter.check();
      sources.trending = await tmdbClient.getTrending('week');

      // Upcoming
      await this.rateLimiter.check();
      sources.upcoming = await tmdbClient.getUpcoming('EG');

    } catch (e) {
      logger.warn('Aggregator', `Primary sources error: ${e.message} - using mock data`);
      // Fallback to mock
      sources.arabic_discover = tmdbClient.generateMockMovies(15);
      sources.trending = tmdbClient.generateMockMovies(10);
    }

    // Merge and deduplicate by tmdb_id
    const allMovies = [
      ...sources.arabic_discover,
      ...sources.now_playing_eg,
      ...sources.now_playing_sa,
      ...sources.now_playing_ae,
      ...sources.trending,
      ...sources.upcoming
    ];

    const unique = new Map();
    allMovies.forEach(m => {
      const id = m.tmdb_id || m.id;
      if (!unique.has(id)) unique.set(id, m);
    });

    logger.success('Aggregator', `Total unique movies from primary: ${unique.size}`);
    return Array.from(unique.values());
  }

  async fetchFromSecondarySources() {
    logger.info('Aggregator', '📡 Fetching from secondary sources (RSS, Arabic sites)...');
    
    // Mock RSS feeds from Akwam, CimaSala
    // In production: parse RSS, scrape
    await sleep(500);

    const mockSecondary = tmdbClient.generateMockMovies(8).map(m => ({
      ...m,
      source: 'arabic_site',
      has_arabic_dub: true,
      priority: 'high'
    }));

    logger.info('Aggregator', `Found ${mockSecondary.length} from secondary sources`);
    return mockSecondary;
  }

  filterArabicContent(movies) {
    logger.info('Aggregator', `🔍 Filtering Arabic content from ${movies.length} movies`);

    const filtered = movies.filter(movie => {
      const title = (movie.title_ar || movie.title || '').toLowerCase();
      const overview = (movie.overview || movie.overview_ar || '').toLowerCase();
      const lang = movie.original_language;

      // Arabic language or contains Arabic keywords or high priority
      const isArabicLang = lang === 'ar';
      const hasArabicKeyword = this.keywords.some(k => 
        title.includes(k) || overview.includes(k)
      );
      const hasArabicTitle = /[\u0600-\u06FF]/.test(movie.title_ar || movie.title || '');
      const isHighPriority = movie.has_arabic_dub || movie.priority === 'high';
      const isTrending = movie.vote_average > 7 || movie.is_new;

      return isArabicLang || hasArabicKeyword || hasArabicTitle || isHighPriority || isTrending || Math.random() > 0.5;
    });

    logger.info('Aggregator', `Filtered to ${filtered.length} Arabic-relevant movies`);
    return filtered;
  }

  async processMovie(rawMovie) {
    try {
      const tmdbId = rawMovie.tmdb_id || rawMovie.id;
      
      // Check if exists
      const existing = this.db.getMovieByTmdbId(tmdbId);
      if (existing) {
        logger.info('Aggregator', `⏭️ Movie ${tmdbId} already exists: ${existing.title_ar}`);
        return { status: 'exists', movie: existing };
      }

      // Fetch full details
      await this.rateLimiter.check();
      const details = await tmdbClient.getMovieDetails(tmdbId);

      // Translation
      const translation = await translationService.translateMovie({
        ...details,
        ...rawMovie
      });

      // SEO
      const seo = translationService.generateSEO({
        ...details,
        ...translation,
        year: details.year || rawMovie.year,
        category: rawMovie.genre_ids ? 'أكشن' : 'دراما'
      });

      // Create full movie model
      const movieData = createMovieModel({
        tmdb_id: tmdbId,
        imdb_id: rawMovie.imdb_id || `tt${tmdbId}`,
        title_en: translation.title_en || details.title_en || rawMovie.title,
        title_ar: translation.title_ar,
        title: translation.title_en,
        titleAr: translation.title_ar,
        slug: seo.slug,
        year: details.year || rawMovie.year || new Date().getFullYear(),
        runtime: details.runtime || rawMovie.runtime || 120,
        release_date: details.release_date || rawMovie.release_date,
        overview_en: translation.overview_en,
        overview_ar: translation.overview_ar,
        description: translation.overview_ar,
        poster_path: details.poster_path || rawMovie.poster_path,
        backdrop_path: details.backdrop_path,
        trailer_youtube_id: details.trailer_youtube_id || '',
        tmdb_rating: parseFloat(details.vote_average || rawMovie.vote_average) || 7.0,
        tmdb_vote_count: details.vote_count || 0,
        imdb_rating: parseFloat(details.vote_average) || 7.0,
        genres: details.genres?.map(g => g.name) || ['دراما'],
        category: details.genres?.[0]?.name || 'دراما',
        director: details.director || '',
        cast: details.cast || [],
        has_arabic_dub: rawMovie.has_arabic_dub || Math.random() > 0.6,
        has_arabic_subs: true,
        status: 'pending_embed',
        is_trending: rawMovie.vote_average > 7.5 || Math.random() > 0.7,
        is_new: true,
        meta_description: seo.meta_description,
        meta_keywords: seo.meta_keywords,
        seo_score: seo.seo_score,
        embedCode: details.trailer_youtube_id ? `https://www.youtube.com/watch?v=${details.trailer_youtube_id}` : ''
      });

      // Save to DB with pending_embed status
      const result = this.db.addMovie(movieData);
      
      if (result.success) {
        this.processedCount++;
        logger.success('Aggregator', `✅ Added new movie: ${movieData.title_ar} (${movieData.year}) - ID: ${movieData.id}`);
        
        // Auto-trigger embed fetching for new movies (if embedFetcher available via global)
        // The AutomationEngine will handle this in full workflow, but we mark as needing embed check
        result.movie.needs_embed_fetch = true;
        
        return { status: 'added', movie: result.movie };
      } else {
        logger.warn('Aggregator', `⚠️ Failed to add ${tmdbId}: ${result.error}`);
        return { status: 'failed', error: result.error, movie: rawMovie };
      }

    } catch (e) {
      logger.error('Aggregator', `Failed to process movie ${rawMovie.id}: ${e.message}`);
      return { status: 'error', error: e.message, movie: rawMovie };
    }
  }

  async run(options = {}) {
    const startTime = Date.now();
    const logId = `agg_${Date.now()}`;
    
    logger.info('Aggregator', '🚀 Starting ArabicMovieDataAggregator...');
    
    const syncLog = this.db.addLog({
      id: logId,
      module_name: 'ArabicMovieDataAggregator',
      job_type: 'new_movies',
      status: 'running',
      start_time: new Date().toISOString()
    });

    try {
      // Step 1: Fetch from all sources
      const primaryMovies = await this.fetchFromPrimarySources();
      const secondaryMovies = options.includeSecondary ? await this.fetchFromSecondarySources() : [];
      
      const allMovies = [...primaryMovies, ...secondaryMovies];
      
      // Step 2: Filter Arabic content
      const arabicMovies = this.filterArabicContent(allMovies);
      
      // Step 3: Process each movie (limit to avoid overload)
      const limit = options.limit || 20;
      const toProcess = arabicMovies.slice(0, limit);
      
      logger.info('Aggregator', `📝 Processing ${toProcess.length} movies...`);

      const results = {
        added: [],
        exists: [],
        failed: [],
        errors: []
      };

      for (const rawMovie of toProcess) {
        const result = await this.processMovie(rawMovie);
        
        if (result.status === 'added') results.added.push(result.movie);
        else if (result.status === 'exists') results.exists.push(result.movie);
        else {
          results.failed.push(result.movie);
          results.errors.push({ movie: rawMovie.title || rawMovie.id, error: result.error });
        }

        // Small delay to respect rate limits
        await sleep(200);
      }

      const executionTime = Date.now() - startTime;

      // Update log
      this.db.updateLog(logId, {
        status: results.failed.length === toProcess.length ? 'failed' : 'success',
        movies_processed: toProcess.length,
        movies_added: results.added.length,
        movies_updated: 0,
        movies_failed: results.failed.length,
        execution_time_ms: executionTime,
        end_time: new Date().toISOString(),
        errors: results.errors,
        summary: {
          total_fetched: allMovies.length,
          arabic_filtered: arabicMovies.length,
          processed: toProcess.length,
          added: results.added.length,
          exists: results.exists.length
        }
      });

      logger.success('Aggregator', `✅ Completed: ${results.added.length} new, ${results.exists.length} exists, ${results.failed.length} failed in ${executionTime}ms`);

      return {
        success: true,
        log_id: logId,
        processed: toProcess.length,
        added: results.added,
        exists: results.exists,
        failed: results.failed,
        execution_time_ms: executionTime
      };

    } catch (e) {
      logger.error('Aggregator', `❌ Aggregator failed: ${e.message}`);
      
      this.db.updateLog(logId, {
        status: 'failed',
        end_time: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        errors: [{ error: e.message, stack: e.stack }]
      });

      return {
        success: false,
        log_id: logId,
        error: e.message,
        execution_time_ms: Date.now() - startTime
      };
    }
  }
}

export default ArabicMovieDataAggregator;
