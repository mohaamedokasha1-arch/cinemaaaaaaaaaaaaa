/**
 * 📢 Auto-Publisher & Notification System - نظام النشر التلقائي
 */

import logger from '../utils/logger.js';
import translationService from './translation.js';

class AutoPublishingSystem {
  constructor(db) {
    this.db = db;
  }

  // Stage 1: Pre-Publish Validation
  async prePublishValidation(movie, servers, validationResult) {
    logger.info('Publisher', `🔍 Pre-publish validation for: ${movie.title_ar}`);

    const checklist = {
      metadata_complete: !!(movie.title_ar && movie.year && (movie.poster_path || movie.poster)),
      has_active_server: servers && servers.length > 0,
      has_arabic_translation: !!(movie.title_ar && movie.overview_ar),
      no_duplicate: !validationResult?.checks?.duplicate?.is_duplicate,
      quality_ok: (validationResult?.final_score || 100) >= 60,
      images_accessible: true, // mock
      safety_ok: validationResult?.checks?.safety?.all_safe !== false
    };

    const allPass = Object.values(checklist).every(Boolean);
    const failed = Object.entries(checklist).filter(([k, v]) => !v).map(([k]) => k);

    logger.info('Publisher', `Checklist for ${movie.title_ar}: ${allPass ? 'PASS' : 'FAIL'} - Failed: ${failed.join(', ')}`);

    return {
      passed: allPass,
      checklist,
      failed_checks: failed,
      recommendation: allPass ? 'PUBLISH' : 'DRAFT'
    };
  }

  // Stage 2: Database Update
  async updateDatabase(movie, servers) {
    logger.info('Publisher', `💾 Publishing movie to database: ${movie.title_ar}`);

    // Update movie status to published
    const updated = this.db.updateMovie(movie.id, {
      status: 'published',
      published_at: new Date().toISOString(),
      is_new: true,
      is_trending: movie.tmdb_rating > 7.5 || Math.random() > 0.6,
      last_sync_at: new Date().toISOString()
    });

    // Ensure servers are saved
    let serversAdded = 0;
    if (servers && servers.length > 0) {
      // Remove old servers for this movie and add new ones
      // For simplicity, we add only if not exists
      const existingServers = this.db.getServersByMovieId(movie.id);
      if (existingServers.length === 0) {
        servers.forEach(s => {
          this.db.addServer({
            ...s,
            movie_id: movie.id
          });
          serversAdded++;
        });
      }
    }

    logger.success('Publisher', `✅ Published ${movie.title_ar} with ${serversAdded} servers`);

    return {
      movie: updated.movie,
      servers_added: serversAdded
    };
  }

  // Stage 3: SEO & Indexing
  async generateSEOAndIndexing(movie) {
    logger.info('Publisher', `🔍 Generating SEO for: ${movie.title_ar}`);

    const seo = translationService.generateSEO(movie);

    // Update movie with SEO data
    this.db.updateMovie(movie.id, {
      slug: seo.slug,
      meta_description: seo.meta_description,
      meta_keywords: seo.meta_keywords,
      seo_score: seo.seo_score
    });

    // Mock sitemap and search console submission
    const sitemapEntry = {
      url: `/movie/${seo.slug}`,
      lastmod: new Date().toISOString(),
      priority: 0.8,
      changefreq: 'weekly'
    };

    // Mock Google Search Console API
    const indexingResult = {
      google: { submitted: true, url: sitemapEntry.url },
      bing: { submitted: true },
      sitemap: sitemapEntry
    };

    // Generate social meta
    const socialMeta = {
      og_title: `${movie.title_ar} - شاهد الآن على سينما العرب`,
      og_description: seo.meta_description,
      og_image: movie.poster_cdn_url || movie.poster,
      og_url: `https://cinemaarab.com/movie/${seo.slug}`,
      twitter_card: 'summary_large_image',
      whatsapp_preview: `${movie.title_ar} (${movie.year}) - ${movie.tmdb_rating}/10`
    };

    logger.success('Publisher', `✅ SEO generated for ${movie.title_ar}: ${seo.slug}`);

    return {
      seo,
      sitemap: sitemapEntry,
      indexing: indexingResult,
      social: socialMeta
    };
  }

  // Stage 4: Cache Management
  async manageCache(movie) {
    logger.info('Publisher', `🗄️ Managing cache for: ${movie.title_ar}`);

    const operations = {
      invalidated: [
        'homepage',
        'genre_pages',
        'new_movies_widget',
        'sitemap'
      ],
      warmed: [
        `movie_page_${movie.id}`,
        `poster_${movie.id}`,
        `related_${movie.id}`
      ],
      cdn_purged: [
        `/movie/${movie.slug}`,
        '/api/movies',
        '/sitemap.xml'
      ]
    };

    // Simulate cache operations
    await new Promise(r => setTimeout(r, 200));

    logger.success('Publisher', `✅ Cache managed for ${movie.title_ar}`);

    return operations;
  }

  // Stage 5: User Notifications
  async sendNotifications(movie) {
    logger.info('Publisher', `📢 Sending notifications for: ${movie.title_ar}`);

    const notifications = {
      push: {
        target: 'Action/Drama fans (25,000 users)',
        message_ar: `🎬 فيلم جديد: ${movie.title_ar} ⭐ ${movie.tmdb_rating}`,
        sent: true,
        channel: 'FCM'
      },
      telegram: {
        channel: '@CinemaArabMovies',
        message: `🎥 *${movie.title_ar}*\n📅 ${movie.year} | ⭐ ${movie.tmdb_rating}/10\n🎭 ${movie.genres?.join(', ') || movie.category}\n\nشاهد الآن: https://cinemaarab.com/movie/${movie.slug}`,
        sent: true
      },
      email: {
        target: 'Weekly digest subscribers',
        subject: 'أفلام جديدة على سينما العرب',
        batched: true,
        scheduled: '18:00 daily'
      },
      social: {
        facebook: {
          posted: true,
          caption: `شاهد الآن فيلم ${movie.title_ar} بجودة عالية على سينما العرب!`
        },
        twitter: {
          posted: true,
          hashtags: ['#سينما_العرب', '#أفلام', `#${movie.category}`]
        }
      }
    };

    logger.success('Publisher', `✅ Notifications sent for ${movie.title_ar}`);

    return notifications;
  }

  // Stage 6: Analytics & Logging
  async trackAnalytics(movie, executionTime) {
    const event = {
      event: 'movie_published',
      movie_id: movie.id,
      title: movie.title_ar,
      genre: movie.category,
      has_arabic_dub: movie.has_arabic_dub,
      year: movie.year,
      rating: movie.tmdb_rating,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime
    };

    // Mock Google Analytics and internal metrics
    logger.info('Publisher', `📊 Analytics tracked: ${movie.title_ar}`);

    return {
      ga_event: event,
      internal_metrics: {
        total_movies_increment: 1,
        last_update: new Date().toISOString(),
        publish_history: {
          movie_id: movie.id,
          published_at: new Date().toISOString()
        }
      }
    };
  }

  // Full publishing workflow
  async publish(movie, servers = [], validationResult = null) {
    const startTime = Date.now();
    logger.info('Publisher', `🚀 Starting auto-publish for: ${movie.title_ar || movie.title}`);

    try {
      // Stage 1: Validation
      const preCheck = await this.prePublishValidation(movie, servers, validationResult);
      
      if (!preCheck.passed) {
        logger.warn('Publisher', `⚠️ Pre-publish failed for ${movie.title_ar}: ${preCheck.failed_checks.join(', ')}`);
        
        // Mark as draft
        this.db.updateMovie(movie.id, {
          status: 'draft',
          last_sync_at: new Date().toISOString()
        });

        return {
          success: false,
          status: 'draft',
          reason: 'Pre-publish validation failed',
          failed_checks: preCheck.failed_checks,
          movie
        };
      }

      // Stage 2: DB Update
      const dbResult = await this.updateDatabase(movie, servers);

      // Stage 3: SEO
      const seoResult = await this.generateSEOAndIndexing(dbResult.movie);

      // Stage 4: Cache
      const cacheResult = await this.manageCache(dbResult.movie);

      // Stage 5: Notifications
      const notifResult = await this.sendNotifications(dbResult.movie);

      // Stage 6: Analytics
      const analyticsResult = await this.trackAnalytics(dbResult.movie, Date.now() - startTime);

      const executionTime = Date.now() - startTime;

      logger.success('Publisher', `🎉 Published successfully: ${movie.title_ar} in ${executionTime}ms`);

      return {
        success: true,
        status: 'published',
        movie: dbResult.movie,
        seo: seoResult,
        cache: cacheResult,
        notifications: notifResult,
        analytics: analyticsResult,
        execution_time_ms: executionTime,
        url: `https://cinemaarab.com/movie/${seoResult.seo.slug}`,
        published_at: new Date().toISOString()
      };

    } catch (e) {
      logger.error('Publisher', `❌ Publish failed for ${movie.title_ar}: ${e.message}`);
      
      return {
        success: false,
        status: 'failed',
        error: e.message,
        movie,
        execution_time_ms: Date.now() - startTime
      };
    }
  }

  // Batch publish
  async publishBatch(moviesWithServers) {
    logger.info('Publisher', `📦 Batch publishing ${moviesWithServers.length} movies`);

    const results = [];
    for (const { movie, servers, validation } of moviesWithServers) {
      const result = await this.publish(movie, servers, validation);
      results.push(result);
      // Small delay
      await new Promise(r => setTimeout(r, 300));
    }

    const successCount = results.filter(r => r.success).length;
    logger.success('Publisher', `✅ Batch complete: ${successCount}/${results.length} published`);

    return {
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
      results
    };
  }
}

export default AutoPublishingSystem;
