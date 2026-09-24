/**
 * 🕷️ Arabic Sites Scraping - كشط المواقع العربية
 * Akwam, CimaSala, FaselHD, ArabSeed
 */

import logger from '../utils/logger.js';
import { randomDelay, CircuitBreaker } from '../utils/helpers.js';

class ArabicScraper {
  constructor() {
    this.circuitBreakers = {
      akwam: new CircuitBreaker(3, 60000),
      cimasala: new CircuitBreaker(3, 60000),
      faselhd: new CircuitBreaker(3, 60000)
    };
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
  }

  getRandomUA() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  // Simulate Playwright scraping for Akwam
  async scrapeAkwam(title, year) {
    return this.circuitBreakers.akwam.call(async () => {
      logger.info('ArabicScraper', `🔍 Scraping Akwam for: ${title} (${year})`);
      await randomDelay(500, 1500);

      // Simulate search and extraction
      // In production: use Playwright
      // const browser = await playwright.chromium.launch();
      // const page = await browser.newPage();
      // await page.goto(`https://akwam.to/search?q=${encodeURIComponent(title)}`);

      // Mock 70% success rate for Arabic content
      if (Math.random() > 0.3) {
        const qualities = ['HD', '1080p', '720p'];
        return [{
          server_name: 'Akwam (دبلجة عربية)',
          embed_url: `https://akwam.to/watch/${Math.floor(Math.random() * 100000)}/${encodeURIComponent(title)}`,
          quality: qualities[Math.floor(Math.random() * qualities.length)],
          language: 'ar',
          has_arabic_dub: true,
          has_arabic_subs: true,
          isDubbed: true,
          priority: 1,
          source: 'akwam',
          response_time_ms: 250 + Math.floor(Math.random() * 300)
        }];
      }
      throw new Error('Akwam: Movie not found');
    }).catch(e => {
      logger.warn('ArabicScraper', `Akwam failed for ${title}: ${e.message}`);
      return [];
    });
  }

  async scrapeCimaSala(title, year) {
    return this.circuitBreakers.cimasala.call(async () => {
      logger.info('ArabicScraper', `🔍 Scraping CimaSala for: ${title}`);
      await randomDelay(400, 1200);

      if (Math.random() > 0.4) {
        return [
          {
            server_name: 'CimaSala - سيرفر 1',
            embed_url: `https://cimasala.com/embed/${Math.floor(Math.random() * 10000)}`,
            quality: 'HD',
            language: 'ar',
            has_arabic_subs: true,
            has_arabic_dub: Math.random() > 0.5,
            priority: 5,
            source: 'cimasala',
            response_time_ms: 350 + Math.floor(Math.random() * 400)
          },
          {
            server_name: 'CimaSala - سيرفر 2',
            embed_url: `https://cimasala.com/embed/${Math.floor(Math.random() * 10000)}/hd`,
            quality: '1080p',
            language: 'multi',
            has_arabic_subs: true,
            priority: 6,
            source: 'cimasala',
            response_time_ms: 400 + Math.floor(Math.random() * 300)
          }
        ];
      }
      throw new Error('CimaSala: Not found');
    }).catch(e => {
      logger.warn('ArabicScraper', `CimaSala failed: ${e.message}`);
      return [];
    });
  }

  async scrapeFaselHD(title, year) {
    return this.circuitBreakers.faselhd.call(async () => {
      logger.info('ArabicScraper', `🔍 Scraping FaselHD for: ${title}`);
      await randomDelay(600, 1800);

      // FaselHD requires API reverse engineering
      if (Math.random() > 0.5) {
        return [{
          server_name: 'FaselHD',
          embed_url: `https://www.faselhd.link/embed/${Math.floor(Math.random() * 50000)}`,
          quality: '1080p',
          language: 'ar',
          has_arabic_subs: true,
          has_arabic_dub: true,
          priority: 2,
          source: 'faselhd',
          response_time_ms: 300 + Math.floor(Math.random() * 250)
        }];
      }
      throw new Error('FaselHD: API error');
    }).catch(e => {
      logger.warn('ArabicScraper', `FaselHD failed: ${e.message}`);
      return [];
    });
  }

  async scrapeArabSeed(title, year) {
    logger.info('ArabicScraper', `🔍 Scraping ArabSeed for: ${title}`);
    await randomDelay(300, 900);

    if (Math.random() > 0.6) {
      return [{
        server_name: 'ArabSeed',
        embed_url: `https://arabseed.com/watch/${Math.floor(Math.random() * 100000)}`,
        quality: 'HD',
        language: 'ar',
        has_arabic_subs: true,
        priority: 7,
        source: 'arabseed',
        response_time_ms: 500 + Math.floor(Math.random() * 400)
      }];
    }
    return [];
  }

  // Main aggregation for Arabic content
  async scrapeAll(title, year) {
    logger.info('ArabicScraper', `🚀 Starting Arabic scraping for: ${title} (${year})`);
    
    const results = await Promise.allSettled([
      this.scrapeAkwam(title, year),
      this.scrapeCimaSala(title, year),
      this.scrapeFaselHD(title, year),
      this.scrapeArabSeed(title, year)
    ]);

    const allLinks = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .filter(Boolean);

    logger.success('ArabicScraper', `Found ${allLinks.length} Arabic servers for ${title}`);
    return allLinks;
  }

  // Check if movie has Arabic dubbing available
  async checkArabicDubbing(title, year) {
    const links = await this.scrapeAll(title, year);
    const dubbed = links.filter(l => l.has_arabic_dub || l.isDubbed);
    return {
      has_dub: dubbed.length > 0,
      dub_count: dubbed.length,
      servers: dubbed,
      quality: dubbed.length > 0 ? 'official' : null
    };
  }
}

const arabicScraper = new ArabicScraper();
export default arabicScraper;
