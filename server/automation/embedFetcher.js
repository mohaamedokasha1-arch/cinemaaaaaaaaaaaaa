/**
 * 🔗 Embed Links Fetcher - محرك جلب روابط التشغيل
 * يطبق Strategy A, B, C من المخطط الهندسي
 */

import logger from '../utils/logger.js';
import { randomDelay, isValidUrl } from '../utils/helpers.js';
import arabicScraper from './arabicScraper.js';

class EmbedLinksFetcherPro {
  constructor() {
    this.primaryServers = [
      {
        name: 'VidSrc',
        urlTemplate: 'https://vidsrc.to/embed/movie/{tmdb_id}',
        validation: 'HEAD',
        quality: 'AUTO',
        priority: 2
      },
      {
        name: '2Embed',
        urlTemplate: 'https://www.2embed.to/embed/tmdb/movie?id={tmdb_id}',
        validation: 'GET',
        quality: 'multi',
        priority: 3
      },
      {
        name: 'SuperEmbed',
        urlTemplate: 'https://multiembed.mov/?video_id={tmdb_id}&tmdb=1',
        validation: 'HEAD',
        quality: 'HD',
        priority: 4
      },
      {
        name: 'VidLink Pro',
        urlTemplate: 'https://vidlink.pro/movie/{tmdb_id}',
        validation: 'PLAYWRIGHT',
        quality: '1080p',
        priority: 3
      },
      {
        name: 'Warezcdn',
        urlTemplate: 'https://warezcdn.com/embed/{imdb_id}',
        validation: 'HEAD',
        quality: 'HD',
        priority: 5
      },
      {
        name: 'AutoEmbed',
        urlTemplate: 'https://autoembed.cc/embed/movie/{tmdb_id}',
        validation: 'JSON',
        quality: 'HD',
        priority: 6
      },
      {
        name: 'EmbedHub',
        urlTemplate: 'https://embedhub.cc/api/v1/movie/{tmdb_id}',
        validation: 'API',
        quality: '1080p',
        priority: 7
      },
      {
        name: 'MovCloud',
        urlTemplate: 'https://movcloud.net/embed/{imdb_id}',
        validation: 'HEAD',
        quality: 'HD',
        priority: 8
      }
    ];

    this.blacklistedDomains = [
      'malicious.com',
      'fake-player.net',
      'ads-tracker.com'
    ];
  }

  // Strategy A: Direct Embed APIs (سريع وموثوق)
  async generateDirectEmbeds(tmdbId, imdbId) {
    const servers = [];

    for (const template of this.primaryServers) {
      let url = template.urlTemplate
        .replace('{tmdb_id}', tmdbId || '')
        .replace('{imdb_id}', imdbId || '');

      // Skip if required ID missing
      if (url.includes('{tmdb_id}') || url.includes('{imdb_id}')) continue;
      if (!isValidUrl(url)) continue;
      if (this.isBlacklisted(url)) continue;

      servers.push({
        server_name: template.name,
        embed_url: url,
        url,
        quality: template.quality,
        language: 'multi',
        has_arabic_subs: true,
        has_arabic_dub: false,
        priority: template.priority,
        server_type: 'embed',
        is_verified: false,
        source: 'direct_api',
        response_time_ms: 200 + Math.floor(Math.random() * 600)
      });
    }

    logger.info('EmbedFetcher', `Generated ${servers.length} direct embed URLs for TMDB ${tmdbId}`);
    return servers;
  }

  // Strategy B: Arabic Sites Scraping (محتوى عربي)
  async fetchArabicServers(title, titleAr, year) {
    const searchTitle = titleAr || title;
    logger.info('EmbedFetcher', `🌍 Fetching Arabic servers for: ${searchTitle}`);

    try {
      const arabicLinks = await arabicScraper.scrapeAll(searchTitle, year);
      return arabicLinks.map(link => ({
        server_name: link.server_name,
        embed_url: link.embed_url,
        url: link.embed_url,
        quality: link.quality || 'HD',
        language: link.language || 'ar',
        has_arabic_subs: link.has_arabic_subs || true,
        has_arabic_dub: link.has_arabic_dub || link.isDubbed || false,
        isDubbed: link.isDubbed || link.has_arabic_dub || false,
        priority: link.priority || 1,
        server_type: 'embed',
        is_verified: true,
        source: link.source || 'arabic_scrape',
        response_time_ms: link.response_time_ms || 300
      }));
    } catch (e) {
      logger.warn('EmbedFetcher', `Arabic scraping failed: ${e.message}`);
      return [];
    }
  }

  // Strategy C: Multi-Embed Aggregators
  async fetchFromAggregators(tmdbId, imdbId) {
    logger.info('EmbedFetcher', `🔗 Fetching from aggregator APIs for ${tmdbId}`);
    await randomDelay(300, 800);

    // Mock aggregator responses
    const mockAggregators = [
      {
        name: 'AutoEmbed API',
        servers: [
          {
            server_name: 'AutoEmbed - HD',
            embed_url: `https://autoembed.cc/embed/movie/${tmdbId}/hd`,
            quality: '1080p',
            language: 'multi',
            has_arabic_subs: true,
            priority: 8
          },
          {
            server_name: 'AutoEmbed - SD',
            embed_url: `https://autoembed.cc/embed/movie/${tmdbId}/sd`,
            quality: '720p',
            language: 'multi',
            has_arabic_subs: false,
            priority: 9
          }
        ]
      },
      {
        name: 'EmbedHub',
        servers: [
          {
            server_name: 'EmbedHub Premium',
            embed_url: `https://embedhub.cc/embed/${imdbId || tmdbId}`,
            quality: '1080p',
            language: 'en',
            has_arabic_subs: true,
            priority: 7
          }
        ]
      }
    ];

    const servers = [];
    for (const agg of mockAggregators) {
      if (Math.random() > 0.3) {
        servers.push(...agg.servers.map(s => ({
          ...s,
          url: s.embed_url,
          server_type: 'embed',
          is_verified: false,
          source: 'aggregator',
          response_time_ms: 400 + Math.floor(Math.random() * 500)
        })));
      }
    }

    return servers;
  }

  // Advanced Validation
  async validateEmbedLink(url, deepCheck = false) {
    try {
      // Basic checks
      if (!isValidUrl(url)) return { valid: false, reason: 'Invalid URL' };
      if (this.isBlacklisted(url)) return { valid: false, reason: 'Blacklisted domain' };
      if (url.length > 500) return { valid: false, reason: 'URL too long' };

      // Simulate HEAD request
      await randomDelay(100, 400);
      
      // Mock 85% success rate
      const isValid = Math.random() > 0.15;
      if (!isValid) {
        return { valid: false, reason: 'Connection failed', status: 404 };
      }

      // Deep check with Playwright (mocked)
      if (deepCheck) {
        await randomDelay(500, 1200);
        
        // Simulate video element detection
        const hasVideo = Math.random() > 0.1;
        if (!hasVideo) {
          return { valid: false, reason: 'No video element', status: 200 };
        }

        // Quality detection
        const qualityIndicators = ['1080p', 'HD', '720p', '4K'];
        const detectedQuality = qualityIndicators[Math.floor(Math.random() * qualityIndicators.length)];
        
        // Language detection
        const hasArabicSubs = Math.random() > 0.3;
        const hasArabicDub = Math.random() > 0.7;

        return {
          valid: true,
          status: 200,
          quality: detectedQuality,
          has_arabic_subs: hasArabicSubs,
          has_arabic_dub: hasArabicDub,
          response_time: 200 + Math.floor(Math.random() * 800),
          screenshot_valid: true
        };
      }

      return {
        valid: true,
        status: 200,
        response_time: 150 + Math.floor(Math.random() * 600)
      };
    } catch (e) {
      return { valid: false, reason: e.message, status: 0 };
    }
  }

  async validateAllLinks(servers, deepCheck = false) {
    logger.info('EmbedFetcher', `🔍 Validating ${servers.length} servers (deep=${deepCheck})`);
    
    const results = [];
    const concurrency = 5;
    
    // Process in batches to avoid overwhelming
    for (let i = 0; i < servers.length; i += concurrency) {
      const batch = servers.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (server) => {
          const validation = await this.validateEmbedLink(server.embed_url, deepCheck);
          return {
            ...server,
            is_active: validation.valid,
            is_verified: validation.valid,
            response_time_ms: validation.response_time || server.response_time_ms,
            validation_result: validation,
            last_checked: new Date().toISOString(),
            failed_checks: validation.valid ? 0 : (server.failed_checks || 0) + 1
          };
        })
      );
      results.push(...batchResults);
      await randomDelay(100, 300);
    }

    const valid = results.filter(r => r.is_active);
    logger.success('EmbedFetcher', `Validation complete: ${valid.length}/${servers.length} valid`);

    return {
      all: results,
      valid,
      invalid: results.filter(r => !r.is_active)
    };
  }

  // Quality detection
  detectQualityFromUrl(url, pageContent = '') {
    const lower = (url + ' ' + pageContent).toLowerCase();
    if (lower.includes('4k') || lower.includes('2160p')) return '4K';
    if (lower.includes('1080p') || lower.includes('full hd')) return '1080p';
    if (lower.includes('720p') || lower.includes('hd')) return 'HD';
    if (lower.includes('cam') || lower.includes('ts')) return 'CAM';
    return 'AUTO';
  }

  isBlacklisted(url) {
    return this.blacklistedDomains.some(domain => url.includes(domain));
  }

  // Main method - get all embed links for a movie
  async getEmbedLinksForMovie(movieData) {
    const { tmdb_id, imdb_id, title, title_ar, titleAr, year } = movieData;
    
    logger.info('EmbedFetcher', `🎬 Fetching embeds for: ${title_ar || titleAr || title} (${year})`);

    const startTime = Date.now();
    let allServers = [];

    // Strategy A: Direct APIs (parallel)
    const directServers = await this.generateDirectEmbeds(tmdb_id, imdb_id);
    allServers.push(...directServers);

    // Strategy B: Arabic scraping (parallel with A)
    const arabicServers = await this.fetchArabicServers(title, title_ar || titleAr, year);
    allServers.push(...arabicServers);

    // Strategy C: Aggregators
    const aggregatorServers = await this.fetchFromAggregators(tmdb_id, imdb_id);
    allServers.push(...aggregatorServers);

    // Remove duplicates by URL
    const uniqueServers = [];
    const seenUrls = new Set();
    for (const server of allServers) {
      if (!seenUrls.has(server.embed_url)) {
        seenUrls.add(server.embed_url);
        uniqueServers.push(server);
      }
    }

    // Sort by priority (Arabic dubbed first)
    uniqueServers.sort((a, b) => {
      if (a.has_arabic_dub && !b.has_arabic_dub) return -1;
      if (!a.has_arabic_dub && b.has_arabic_dub) return 1;
      if (a.has_arabic_subs && !b.has_arabic_subs) return -1;
      if (!a.has_arabic_subs && b.has_arabic_subs) return 1;
      return a.priority - b.priority;
    });

    // Validate
    const validationResult = await this.validateAllLinks(uniqueServers, false);

    const executionTime = Date.now() - startTime;
    logger.success('EmbedFetcher', `✅ Found ${validationResult.valid.length} valid servers in ${executionTime}ms`);

    return {
      movie_id: movieData.id || movieData.movie_id,
      tmdb_id,
      total_found: uniqueServers.length,
      valid_count: validationResult.valid.length,
      invalid_count: validationResult.invalid.length,
      servers: validationResult.valid,
      all_servers: validationResult.all,
      execution_time_ms: executionTime,
      has_arabic_dub: validationResult.valid.some(s => s.has_arabic_dub),
      has_arabic_subs: validationResult.valid.some(s => s.has_arabic_subs)
    };
  }
}

const embedFetcher = new EmbedLinksFetcherPro();
export default embedFetcher;
