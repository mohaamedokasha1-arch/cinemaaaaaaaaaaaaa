/**
 * 🌐 Translation Pipeline - نظام الترجمة الذكية
 * Google Translate + GPT enhancement
 */

import logger from '../utils/logger.js';

const ARABIC_ACTORS_MAP = {
  'Leonardo DiCaprio': 'ليوناردو دي كابريو',
  'Brad Pitt': 'براد بيت',
  'Tom Hanks': 'توم هانكس',
  'Morgan Freeman': 'مورغان فريمان',
  'Robert De Niro': 'روبرت دي نيرو',
  'Al Pacino': 'آل باتشينو',
  'Johnny Depp': 'جوني ديب',
  'Will Smith': 'ويل سميث',
  'Dwayne Johnson': 'دواين جونسون',
  'Scarlett Johansson': 'سكارليت جوهانسون'
};

class TranslationService {
  constructor() {
    this.cache = new Map();
  }

  // Stage 1: Initial translation (mock Google Translate)
  async initialTranslate(text, targetLang = 'ar') {
    if (!text) return '';
    
    const cacheKey = `${text.slice(0, 50)}_${targetLang}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    // Simulate Google Translate API
    // In production, call: https://translation.googleapis.com/language/translate/v2
    let translated = text;

    // Simple mock translations for demo
    const mockTranslations = {
      'The Guardian': 'الحارس',
      'Black Knight': 'الفارس الأسود',
      'Love Story': 'قصة حب',
      'Action': 'أكشن',
      'Drama': 'دراما',
      'Comedy': 'كوميديا',
      'A thrilling adventure': 'مغامرة مثيرة',
      'In a world': 'في عالم'
    };

    // If exact match, use it
    if (mockTranslations[text]) {
      translated = mockTranslations[text];
    } else {
      // For longer texts, simulate translation with prefix
      // Real implementation would call Google Translate
      if (text.length > 100) {
        translated = `في هذا العمل المثير، ${text.slice(0, 80)}... قصة تجمع بين التشويق والدراما الإنسانية.`;
      } else if (text.length > 20) {
        translated = text
          .replace(/A /g, '')
          .replace(/The /g, 'ال')
          .replace(/story of/gi, 'قصة')
          .replace(/love/gi, 'حب')
          .replace(/action/gi, 'أكشن')
          || `قصة ${text}`;
      }
    }

    this.cache.set(cacheKey, translated);
    return translated;
  }

  // Stage 2: Enhancement with GPT-4 (mock)
  async enhanceTranslation(original, initialTranslation, context = {}) {
    if (!initialTranslation) return '';

    // In production, call OpenAI API with prompt:
    // "قم بتحسين الترجمة التالية للعربية بشكل احترافي: ..."
    
    let enhanced = initialTranslation;

    // Simulate GPT enhancement - make it more natural and cinematic
    if (context.type === 'title') {
      // Titles should be short and catchy
      enhanced = enhanced
        .replace(/فيلم /g, '')
        .replace(/الال/g, 'ال')
        .trim();
      
      // Ensure it's not too long
      if (enhanced.length > 30) {
        enhanced = enhanced.split(' ').slice(0, 4).join(' ');
      }
    } else if (context.type === 'overview') {
      // Overview should be dramatic and natural
      if (!enhanced.includes('يجسد') && !enhanced.includes('تدور')) {
        const titles = ['في هذا العمل المثير،', 'تدور أحداث الفيلم حول', 'يجسد الفيلم قصة'];
        const prefix = titles[Math.floor(Math.random() * titles.length)];
        if (!enhanced.startsWith('في') && !enhanced.startsWith('تدور')) {
          enhanced = `${prefix} ${enhanced}`;
        }
      }
      
      // Add cinematic flair
      enhanced = enhanced
        .replace(/\.\./g, '.')
        .replace(/  /g, ' ')
        .trim();
      
      if (enhanced.length < 50) {
        enhanced += ' في رحلة مليئة بالمفاجآت والتحديات التي ستأخذك إلى عالم آخر.';
      }
    }

    // Translate actor names if present
    Object.entries(ARABIC_ACTORS_MAP).forEach(([en, ar]) => {
      enhanced = enhanced.replace(new RegExp(en, 'g'), ar);
    });

    logger.info('Translation', `Enhanced ${context.type}: ${original.slice(0, 30)} -> ${enhanced.slice(0, 30)}`);
    return enhanced;
  }

  // Stage 3: Validation
  async validateTranslation(text) {
    if (!text) return { valid: false, score: 0, issues: ['نص فارغ'] };
    
    const issues = [];
    let score = 100;

    // Check Arabic characters percentage
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const arabicPercent = (arabicChars / text.length) * 100;
    
    if (arabicPercent < 50) {
      issues.push('نسبة العربية قليلة');
      score -= 20;
    }

    // Check for Google Translate artifacts
    const artifacts = ['غوغل', 'ترجمة من', 'translated by'];
    artifacts.forEach(art => {
      if (text.toLowerCase().includes(art.toLowerCase())) {
        issues.push(`أثر ترجمة آلية: ${art}`);
        score -= 15;
      }
    });

    // Check length
    if (text.length < 2) {
      issues.push('النص قصير جداً');
      score -= 30;
    }

    // Grammar check (simplified)
    if (text.includes('  ') || text.includes('..')) {
      issues.push('أخطاء تنسيق');
      score -= 5;
    }

    return {
      valid: score >= 60,
      score,
      issues,
      arabicPercent
    };
  }

  // Full pipeline
  async translateMovie(movie) {
    try {
      const titleEn = movie.title || movie.title_en || movie.original_title || '';
      const overviewEn = movie.overview || movie.overview_en || '';

      // Translate title
      let titleArInitial = await this.initialTranslate(titleEn, 'ar');
      let titleAr = await this.enhanceTranslation(titleEn, titleArInitial, { type: 'title' });
      const titleValidation = await this.validateTranslation(titleAr);

      // Translate overview
      let overviewArInitial = await this.initialTranslate(overviewEn, 'ar');
      let overviewAr = await this.enhanceTranslation(overviewEn, overviewArInitial, { type: 'overview' });
      const overviewValidation = await this.validateTranslation(overviewAr);

      // If validation fails, fallback to improved version
      if (!titleValidation.valid) {
        titleAr = titleEn ? `فيلم ${titleEn}` : 'فيلم جديد';
      }
      if (!overviewValidation.valid) {
        overviewAr = overviewEn ? `قصة مشوقة عن ${titleEn || 'البطل'} في مغامرة لا تُنسى.` : 'فيلم مميز يستحق المشاهدة.';
      }

      return {
        title_ar: titleAr,
        overview_ar: overviewAr,
        title_en: titleEn,
        overview_en: overviewEn,
        translation_score: Math.round((titleValidation.score + overviewValidation.score) / 2),
        translation_valid: titleValidation.valid && overviewValidation.valid
      };
    } catch (e) {
      logger.error('Translation', `Translation failed for ${movie.id}: ${e.message}`);
      return {
        title_ar: movie.title || 'فيلم جديد',
        overview_ar: movie.overview || 'قصة مشوقة',
        title_en: movie.title || '',
        overview_en: movie.overview || '',
        translation_score: 50,
        translation_valid: false
      };
    }
  }

  // SEO Generation
  generateSEO(movie) {
    const titleAr = movie.title_ar || movie.titleAr || movie.title || 'فيلم';
    const year = movie.year || new Date().getFullYear();
    const rating = movie.tmdb_rating || movie.rating || '7.5';
    const plot = (movie.overview_ar || movie.description || '').slice(0, 80);
    const quality = movie.quality || 'HD';

    const metaDescription = `شاهد فيلم ${titleAr} (${year}) ${quality} مترجم اون لاين. ${plot}. تقييم IMDb: ${rating}/10. مشاهدة وتحميل مباشر على سينما العرب.`.slice(0, 160);

    const keywords = [
      `فيلم ${titleAr}`,
      titleAr,
      movie.title_en || movie.title,
      movie.category,
      movie.director,
      ...(movie.cast || []).slice(0, 2).map(c => c.name || c),
      `${year}`,
      'فيلم', 'مشاهدة', 'تحميل', 'اون لاين', 'مترجم', 'مدبلج', 'HD'
    ].filter(Boolean);

    const slug = this.generateSlug(titleAr, year, quality);

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Movie',
      name: titleAr,
      alternateName: movie.title_en || movie.title,
      image: movie.poster || movie.poster_path,
      datePublished: movie.release_date || `${year}-01-01`,
      director: {
        '@type': 'Person',
        name: movie.director || 'غير معروف'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: String(rating),
        bestRating: '10',
        ratingCount: String(movie.tmdb_vote_count || 100)
      },
      genre: movie.genres || [movie.category],
      inLanguage: movie.has_arabic_dub ? 'ar' : 'en',
      description: plot
    };

    return {
      slug,
      meta_description: metaDescription,
      meta_keywords: [...new Set(keywords)].join(', '),
      schema_markup: schema,
      seo_score: Math.min(100, 60 + keywords.length * 2 + (plot.length > 50 ? 10 : 0))
    };
  }

  generateSlug(titleAr, year, quality) {
    const translit = titleAr
      .replace(/[^a-z0-9\u0600-\u06FF]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
    return `${translit}-${year}-${quality || 'hd'}`.toLowerCase();
  }
}

const translationService = new TranslationService();
export default translationService;
