/**
 * 🧠 AUTOMATION ENGINE - العقل المدبر
 * يربط جميع الوحدات: جمع البيانات، سحب الروابط، المزامنة، الذكاء الاصطناعي، النشر
 */

import ArabicMovieDataAggregator from './aggregator.js';
import embedFetcher from './embedFetcher.js';
import aiValidator from './validator.js';
import AutoPublishingSystem from './publisher.js';
import translationService from './translation.js';
import arabicScraper from './arabicScraper.js';
import { tmdbClient } from '../utils/tmdbClient.js';
import logger from '../utils/logger.js';
import { sleep } from '../utils/helpers.js';

class AutomationEngine {
  constructor(db) {
    this.db = db;
    this.aggregator = new ArabicMovieDataAggregator(db);
    this.embedFetcher = embedFetcher;
    this.validator = aiValidator;
    this.publisher = new AutoPublishingSystem(db);
    this.translator = translationService;
    this.arabicScraper = arabicScraper;
    this.scheduler = null; // Will be set after init
    this.isRunning = false;
  }

  setScheduler(scheduler) {
    this.scheduler = scheduler;
  }

  async init() {
    await this.db.init();
    logger.info('AutomationEngine', '🧠 Automation Engine initialized');
    this.isRunning = true;
  }

  // ===== Module 1: Aggregator =====
  async runAggregator(options = {}) {
    logger.info('AutomationEngine', '🎬 Running Aggregator Module...');
    return await this.aggregator.run(options);
  }

  // ===== Module 2: Embed Fetcher for single movie =====
  async fetchEmbedsForMovie(movieId) {
    logger.info('AutomationEngine', `🔗 Fetching embeds for movie: ${movieId}`);
    
    const movie = this.db.getMovieById(movieId);
    if (!movie) {
      throw new Error(`Movie not found: ${movieId}`);
    }

    const log = this.db.addLog({
      module_name: 'EmbedLinksFetcherPro',
      job_type: 'fetch_embeds',
      status: 'running',
      start_time: new Date().toISOString()
    });

    try {
      const result = await this.embedFetcher.getEmbedLinksForMovie(movie);

      // Save valid servers
      let added = 0;
      for (const server of result.servers) {
        // Check if already exists
        const existing = this.db.getServersByMovieId(movie.id).find(s => s.embed_url === server.embed_url);
        if (!existing) {
          this.db.addServer({
            ...server,
            movie_id: movie.id
          });
          added++;
        }
      }

      // Update movie flags
      this.db.updateMovie(movie.id, {
        has_arabic_dub: result.has_arabic_dub || movie.has_arabic_dub,
        has_arabic_subs: result.has_arabic_subs || movie.has_arabic_subs,
        last_sync_at: new Date().toISOString(),
        status: result.valid_count > 0 ? 'published' : movie.status
      });

      this.db.updateLog(log.id, {
        status: 'success',
        servers_added: added,
        servers_validated: result.valid_count,
        execution_time_ms: result.execution_time_ms,
        summary: result
      });

      logger.success('AutomationEngine', `✅ Embeds fetched for ${movie.title_ar}: ${added} new, ${result.valid_count} valid`);

      return {
        movie_id: movie.id,
        movie_title: movie.title_ar,
        ...result,
        servers_added: added
      };

    } catch (e) {
      this.db.updateLog(log.id, {
        status: 'failed',
        errors: [{ error: e.message }],
        end_time: new Date().toISOString()
      });
      logger.error('AutomationEngine', `❌ Embed fetch failed for ${movieId}: ${e.message}`);
      throw e;
    }
  }

  // ===== Full workflow for a movie: fetch embeds -> validate -> publish =====
  async processMovieFullWorkflow(movieId) {
    logger.info('AutomationEngine', `🔄 Full workflow for movie: ${movieId}`);

    const movie = this.db.getMovieById(movieId);
    if (!movie) throw new Error('Movie not found');

    // Step 1: Fetch embeds
    const embedResult = await this.fetchEmbedsForMovie(movieId);
    
    // Step 2: Validate
    const allMovies = this.db.getMovies();
    const servers = this.db.getServersByMovieId(movieId);
    const validation = await this.validator.validateMovie(movie, allMovies, servers);

    // Step 3: Publish if valid
    let publishResult = null;
    if (validation.recommendation === 'AUTO_PUBLISH') {
      publishResult = await this.publisher.publish(movie, servers, validation);
    } else {
      logger.warn('AutomationEngine', `⚠️ Movie ${movie.title_ar} needs review: ${validation.recommendation}`);
    }

    return {
      movie,
      embed_result: embedResult,
      validation,
      publish_result: publishResult,
      workflow: 'completed'
    };
  }

  // ===== Module 3: Scheduler Jobs =====
  async runUpdateExisting() {
    logger.info('AutomationEngine', '🔄 Running UpdateExistingMovies job...');
    
    const log = this.db.addLog({
      module_name: 'IntelligentSyncScheduler',
      job_type: 'update_existing',
      status: 'running',
      start_time: new Date().toISOString()
    });

    try {
      const movies = this.db.getMovies().slice(0, 20); // Batch of 20
      let updated = 0;

      for (const movie of movies) {
        if (!movie.tmdb_id) continue;

        try {
          const details = await tmdbClient.getMovieDetails(movie.tmdb_id);
          
          // Update ratings, etc.
          this.db.updateMovie(movie.id, {
            tmdb_rating: details.vote_average || movie.tmdb_rating,
            tmdb_vote_count: details.vote_count || movie.tmdb_vote_count,
            last_sync_at: new Date().toISOString()
          });
          updated++;
          await sleep(300);
        } catch (e) {
          logger.warn('AutomationEngine', `Failed to update ${movie.id}: ${e.message}`);
        }
      }

      this.db.updateLog(log.id, {
        status: 'success',
        movies_processed: movies.length,
        movies_updated: updated,
        summary: { updated }
      });

      logger.success('AutomationEngine', `✅ Updated ${updated}/${movies.length} movies`);
      return { updated, processed: movies.length };

    } catch (e) {
      this.db.updateLog(log.id, { status: 'failed', errors: [{ error: e.message }] });
      throw e;
    }
  }

  async runEmbedValidation() {
    logger.info('AutomationEngine', '🔍 Running ValidateEmbedLinks job...');

    const log = this.db.addLog({
      module_name: 'EmbedLinksFetcherPro',
      job_type: 'validate_embeds',
      status: 'running',
      start_time: new Date().toISOString()
    });

    try {
      const allServers = [...this.db.servers];
      const validation = await this.embedFetcher.validateAllLinks(allServers, false);

      let activeCount = 0;
      let inactiveCount = 0;

      for (const server of validation.all) {
        this.db.validateServer(server.id, server.is_active, server.response_time_ms);
        if (server.is_active) activeCount++;
        else inactiveCount++;
      }

      this.db.updateLog(log.id, {
        status: 'success',
        servers_validated: validation.all.length,
        servers_added: 0,
        servers_removed: inactiveCount,
        summary: {
          total: validation.all.length,
          active: activeCount,
          inactive: inactiveCount
        }
      });

      logger.success('AutomationEngine', `✅ Validated ${validation.all.length} servers: ${activeCount} active`);

      return {
        total: validation.all.length,
        active: activeCount,
        inactive: inactiveCount
      };

    } catch (e) {
      this.db.updateLog(log.id, { status: 'failed', errors: [{ error: e.message }] });
      throw e;
    }
  }

  async runTrendingUpdate() {
    logger.info('AutomationEngine', '📈 Running TrendingMoviesUpdate job...');

    const log = this.db.addLog({
      module_name: 'IntelligentSyncScheduler',
      job_type: 'trending_update',
      status: 'running',
      start_time: new Date().toISOString()
    });

    try {
      const trending = await tmdbClient.getTrending('day');
      const trendingIds = new Set(trending.map(m => m.tmdb_id || m.id));

      let updated = 0;
      for (const movie of this.db.movies) {
        const shouldBeTrending = trendingIds.has(movie.tmdb_id) || movie.view_count > 1000;
        if (movie.is_trending !== shouldBeTrending) {
          this.db.updateMovie(movie.id, { is_trending: shouldBeTrending });
          updated++;
        }
      }

      this.db.updateLog(log.id, {
        status: 'success',
        movies_updated: updated,
        summary: { trending_found: trending.length, updated }
      });

      logger.success('AutomationEngine', `✅ Trending updated: ${updated} movies`);
      return { trending: trending.length, updated };

    } catch (e) {
      this.db.updateLog(log.id, { status: 'failed', errors: [{ error: e.message }] });
      throw e;
    }
  }

  async runArabicDubCheck() {
    logger.info('AutomationEngine', '🎙️ Running ArabicDubbingCheck job...');

    const log = this.db.addLog({
      module_name: 'ArabicDubbingChecker',
      job_type: 'arabic_dub_check',
      status: 'running',
      start_time: new Date().toISOString()
    });

    try {
      const moviesToCheck = this.db.getMovies().filter(m => !m.has_arabic_dub).slice(0, 15);
      let foundDub = 0;

      for (const movie of moviesToCheck) {
        const dubCheck = await this.arabicScraper.checkArabicDubbing(
          movie.title_ar || movie.titleAr || movie.title,
          movie.year
        );

        if (dubCheck.has_dub) {
          this.db.updateMovie(movie.id, {
            has_arabic_dub: true,
            arabic_dub_quality: dubCheck.quality || 'fan'
          });

          // Add dub servers
          for (const server of dubCheck.servers) {
            this.db.addServer({
              ...server,
              movie_id: movie.id
            });
          }

          foundDub++;
          logger.info('AutomationEngine', `🎉 Found Arabic dub for: ${movie.title_ar}`);
        }

        await sleep(500);
      }

      this.db.updateLog(log.id, {
        status: 'success',
        movies_processed: moviesToCheck.length,
        movies_updated: foundDub,
        summary: { checked: moviesToCheck.length, found_dub: foundDub }
      });

      logger.success('AutomationEngine', `✅ Arabic dub check: ${foundDub}/${moviesToCheck.length} found`);
      return { checked: moviesToCheck.length, found_dub: foundDub };

    } catch (e) {
      this.db.updateLog(log.id, { status: 'failed', errors: [{ error: e.message }] });
      throw e;
    }
  }

  async runCleanup() {
    logger.info('AutomationEngine', '🧹 Running CleanupJob...');

    const log = this.db.addLog({
      module_name: 'CleanupJob',
      job_type: 'cleanup',
      status: 'running',
      start_time: new Date().toISOString()
    });

    try {
      const beforeServers = this.db.servers.length;
      const beforeMovies = this.db.movies.length;

      // Remove inactive servers older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      this.db.servers = this.db.servers.filter(s => {
        if (!s.is_active && new Date(s.last_checked) < thirtyDaysAgo) return false;
        return true;
      });

      // Remove duplicate movies (same tmdb_id)
      const seen = new Set();
      const uniqueMovies = [];
      let duplicates = 0;
      for (const movie of this.db.movies) {
        if (movie.tmdb_id && seen.has(movie.tmdb_id)) {
          duplicates++;
          continue;
        }
        if (movie.tmdb_id) seen.add(movie.tmdb_id);
        uniqueMovies.push(movie);
      }
      this.db.movies = uniqueMovies;

      this.db.persist();

      this.db.updateLog(log.id, {
        status: 'success',
        servers_removed: beforeServers - this.db.servers.length,
        movies_failed: duplicates,
        summary: {
          servers_before: beforeServers,
          servers_after: this.db.servers.length,
          duplicates_removed: duplicates
        }
      });

      logger.success('AutomationEngine', `✅ Cleanup: ${beforeServers - this.db.servers.length} servers, ${duplicates} duplicates removed`);

      return {
        servers_removed: beforeServers - this.db.servers.length,
        duplicates_removed: duplicates
      };

    } catch (e) {
      this.db.updateLog(log.id, { status: 'failed', errors: [{ error: e.message }] });
      throw e;
    }
  }

  // ===== Full sync: new movies + embeds + validation + publish =====
  async runFullSync(options = {}) {
    logger.info('AutomationEngine', '🚀 Starting FULL SYNC...');

    const startTime = Date.now();
    const log = this.db.addLog({
      module_name: 'FullSync',
      job_type: 'full_sync',
      status: 'running',
      start_time: new Date().toISOString()
    });

    try {
      // Step 1: Fetch new movies
      const aggResult = await this.runAggregator({ limit: options.limit || 15 });

      // Step 2: For each new movie, fetch embeds and publish
      const publishResults = [];
      for (const movie of aggResult.added.slice(0, 10)) {
        try {
          const workflow = await this.processMovieFullWorkflow(movie.id);
          publishResults.push(workflow);
          await sleep(800);
        } catch (e) {
          logger.warn('AutomationEngine', `Full sync workflow failed for ${movie.id}: ${e.message}`);
        }
      }

      // Step 3: Validate existing embeds
      await this.runEmbedValidation();

      // Step 4: Update trending
      await this.runTrendingUpdate();

      const executionTime = Date.now() - startTime;

      this.db.updateLog(log.id, {
        status: 'success',
        movies_added: aggResult.added.length,
        movies_processed: aggResult.processed,
        servers_added: publishResults.reduce((sum, r) => sum + (r.embed_result?.servers_added || 0), 0),
        execution_time_ms: executionTime,
        summary: {
          aggregator: aggResult,
          published: publishResults.filter(r => r.publish_result?.success).length,
          execution_time_ms: executionTime
        }
      });

      logger.success('AutomationEngine', `🎉 FULL SYNC completed in ${executionTime}ms: ${aggResult.added.length} new movies`);

      return {
        success: true,
        execution_time_ms: executionTime,
        aggregator: aggResult,
        published: publishResults.length,
        publish_results: publishResults
      };

    } catch (e) {
      this.db.updateLog(log.id, {
        status: 'failed',
        errors: [{ error: e.message }],
        execution_time_ms: Date.now() - startTime
      });
      logger.error('AutomationEngine', `❌ Full sync failed: ${e.message}`);
      throw e;
    }
  }

  // Get status
  getStatus() {
    return {
      is_running: this.isRunning,
      db_stats: this.db.getStats(),
      scheduler: this.scheduler?.getStatus() || null,
      modules: {
        aggregator: 'ready',
        embed_fetcher: 'ready',
        validator: 'ready',
        publisher: 'ready',
        translator: 'ready',
        arabic_scraper: 'ready'
      }
    };
  }
}

export default AutomationEngine;
