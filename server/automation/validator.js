/**
 * 🤖 AI Content Validator - الذكاء الاصطناعي للمطابقة والتحقق
 */

import logger from '../utils/logger.js';
import { similarity, normalizeArabic, levenshtein } from '../utils/helpers.js';

class AIContentValidator {
  constructor() {
    this.qualityThreshold = 60;
    this.duplicateThreshold = 0.9;
    this.bannedDomains = [
      'malware.com', 'phishing.net', 'fake-video.com',
      'excessive-ads.com', 'redirect-loop.com'
    ];
    this.profanityList = ['كلمة بذيئة']; // مبسط
  }

  // 1. كشف التكرار (Duplicate Detection)
  async detectDuplicate(newMovie, existingMovies) {
    logger.info('AIValidator', `🔍 Checking duplicate for: ${newMovie.title_ar || newMovie.title}`);

    const features = {
      title: normalizeArabic(newMovie.title_ar || newMovie.title || ''),
      titleEn: (newMovie.title_en || newMovie.title || '').toLowerCase(),
      year: newMovie.year,
      director: normalizeArabic(newMovie.director || ''),
      plot: normalizeArabic((newMovie.overview_ar || '').slice(0, 200))
    };

    let maxSimilarity = 0;
    let mostSimilar = null;

    for (const existing of existingMovies) {
      const existingFeatures = {
        title: normalizeArabic(existing.title_ar || existing.titleAr || existing.title || ''),
        titleEn: (existing.title_en || existing.title || '').toLowerCase(),
        year: existing.year,
        director: normalizeArabic(existing.director || ''),
        plot: normalizeArabic((existing.overview_ar || existing.description || '').slice(0, 200))
      };

      // Title similarity (most important - 40%)
      const titleSim = Math.max(
        similarity(features.title, existingFeatures.title),
        similarity(features.titleEn, existingFeatures.titleEn)
      );

      // Year exact match (20%)
      const yearSim = features.year && existingFeatures.year && 
                      Math.abs(features.year - existingFeatures.year) <= 1 ? 1 : 0;

      // Director similarity (15%)
      const directorSim = features.director && existingFeatures.director ? 
                          similarity(features.director, existingFeatures.director) : 0;

      // Plot similarity (25%)
      const plotSim = features.plot && existingFeatures.plot ?
                      similarity(features.plot, existingFeatures.plot) : 0;

      // Weighted score
      const totalSim = (titleSim * 0.4) + (yearSim * 0.2) + (directorSim * 0.15) + (plotSim * 0.25);

      if (totalSim > maxSimilarity) {
        maxSimilarity = totalSim;
        mostSimilar = existing;
      }
    }

    const isDuplicate = maxSimilarity > this.duplicateThreshold;
    
    if (isDuplicate) {
      logger.warn('AIValidator', `Duplicate detected: ${newMovie.title} ~ ${mostSimilar?.title} (${(maxSimilarity*100).toFixed(1)}%)`);
    }

    return {
      is_duplicate: isDuplicate,
      similarity_score: maxSimilarity,
      most_similar: mostSimilar,
      confidence: maxSimilarity,
      recommendation: isDuplicate ? 'REJECT' : maxSimilarity > 0.7 ? 'MANUAL_REVIEW' : 'APPROVE'
    };
  }

  // 2. تقييم جودة الروابط (Quality Assessment)
  async assessLinkQuality(embedUrl, screenshotMock = null) {
    // In production: capture screenshot with Playwright and analyze with CNN
    logger.info('AIValidator', `📸 Assessing quality for: ${embedUrl.slice(0, 50)}`);

    // Mock image analysis
    const factors = {
      clarity: 70 + Math.random() * 30, // 70-100
      no_cam: Math.random() > 0.1 ? 100 : 20, // 90% no cam
      player_ui: 60 + Math.random() * 40,
      loading_speed: 50 + Math.random() * 50
    };

    // Weighted score
    const qualityScore = 
      (factors.clarity * 0.4) +
      (factors.no_cam * 0.3) +
      (factors.player_ui * 0.2) +
      (factors.loading_speed * 0.1);

    // Detect CAM
    const isCAM = embedUrl.toLowerCase().includes('cam') || 
                  (screenshotMock && screenshotMock.includes('cam')) ||
                  factors.no_cam < 50;

    return {
      quality_score: Math.round(qualityScore),
      factors,
      is_cam: isCAM,
      detected_quality: isCAM ? 'CAM' : qualityScore > 85 ? '1080p' : qualityScore > 70 ? 'HD' : 'SD',
      recommendation: qualityScore > 70 ? 'APPROVE' : qualityScore > 40 ? 'REVIEW' : 'REJECT',
      has_watermark: Math.random() > 0.8,
      has_hardcoded_subs: Math.random() > 0.7
    };
  }

  async assessMultipleLinks(servers) {
    const assessments = await Promise.all(
      servers.map(async (server) => {
        const quality = await this.assessLinkQuality(server.embed_url);
        return {
          server_id: server.id,
          server_name: server.server_name,
          url: server.embed_url,
          ...quality
        };
      })
    );

    const avgScore = assessments.reduce((sum, a) => sum + a.quality_score, 0) / assessments.length;
    const camCount = assessments.filter(a => a.is_cam).length;

    return {
      assessments,
      average_score: Math.round(avgScore),
      cam_detected: camCount,
      total: assessments.length,
      approved: assessments.filter(a => a.recommendation === 'APPROVE').length
    };
  }

  // 3. أمان المحتوى (Content Safety)
  async checkContentSafety(url) {
    logger.info('AIValidator', `🛡️ Safety check for: ${url.slice(0, 60)}`);

    const checks = {
      malware: false,
      phishing: false,
      excessive_redirects: false,
      fake_player: false,
      ssl_valid: true,
      virus_total_score: 0
    };

    // Check banned domains
    const isBanned = this.bannedDomains.some(d => url.includes(d));
    if (isBanned) {
      checks.malware = true;
      checks.virus_total_score = 5;
    }

    // Simulate VirusTotal API
    if (Math.random() > 0.95) {
      checks.malware = true;
      checks.virus_total_score = Math.floor(Math.random() * 5) + 1;
    }

    // Check redirects (mock)
    checks.excessive_redirects = Math.random() > 0.9;

    // Fake player detection
    checks.fake_player = url.includes('fake') || Math.random() > 0.95;

    // SSL check
    checks.ssl_valid = url.startsWith('https://');

    const isSafe = !checks.malware && !checks.phishing && checks.ssl_valid && 
                   !checks.excessive_redirects && !checks.fake_player &&
                   checks.virus_total_score < 2;

    return {
      is_safe: isSafe,
      checks,
      risk_score: checks.virus_total_score,
      recommendation: isSafe ? 'SAFE' : 'UNSAFE',
      blocked_reason: !isSafe ? 
        (checks.malware ? 'Malware detected' : 
         checks.fake_player ? 'Fake player' : 
         !checks.ssl_valid ? 'Invalid SSL' : 'Security risk') : null
    };
  }

  async checkMultipleUrls(urls) {
    const results = await Promise.all(
      urls.map(url => this.checkContentSafety(url))
    );

    return {
      results,
      safe_count: results.filter(r => r.is_safe).length,
      unsafe_count: results.filter(r => !r.is_safe).length,
      all_safe: results.every(r => r.is_safe)
    };
  }

  // 4. جودة الترجمة
  async validateTranslationQuality(arabicText, englishText = '') {
    if (!arabicText) {
      return { valid: false, score: 0, issues: ['نص فارغ'] };
    }

    let score = 100;
    const issues = [];

    // Arabic characters check
    const arabicChars = (arabicText.match(/[\u0600-\u06FF]/g) || []).length;
    const arabicPercent = (arabicChars / arabicText.length) * 100;

    if (arabicPercent < 70) {
      issues.push(`نسبة العربية قليلة: ${arabicPercent.toFixed(1)}%`);
      score -= 20;
    }

    // Not identical to English
    if (englishText && arabicText.toLowerCase() === englishText.toLowerCase()) {
      issues.push('الترجمة مطابقة للنص الإنجليزي');
      score -= 30;
    }

    // Grammar check (mock LanguageTool API)
    if (arabicText.includes('  ') || arabicText.length < 10) {
      issues.push('أخطاء تنسيق');
      score -= 10;
    }

    // Profanity filter
    const hasProfanity = this.profanityList.some(word => arabicText.includes(word));
    if (hasProfanity) {
      issues.push('محتوى غير لائق');
      score -= 40;
    }

    // Readability (simplified)
    const readability = Math.min(100, 50 + arabicText.length / 2);

    return {
      valid: score >= 60,
      score,
      readability,
      arabic_percent: arabicPercent,
      issues,
      has_profanity: hasProfanity
    };
  }

  // 5. تحقق شامل للفيلم
  async validateMovie(movie, existingMovies = [], servers = []) {
    logger.info('AIValidator', `🤖 Full validation for: ${movie.title_ar || movie.title}`);

    const startTime = Date.now();

    // Run all checks in parallel
    const [duplicateCheck, translationCheck, safetyCheck, qualityCheck] = await Promise.all([
      this.detectDuplicate(movie, existingMovies),
      this.validateTranslationQuality(movie.overview_ar || movie.description, movie.overview_en),
      servers.length > 0 ? this.checkMultipleUrls(servers.map(s => s.embed_url)) : { all_safe: true, safe_count: 0 },
      servers.length > 0 ? this.assessMultipleLinks(servers) : { average_score: 75, approved: 0 }
    ]);

    // Final decision
    let finalScore = 100;
    const warnings = [];
    const errors = [];

    if (duplicateCheck.is_duplicate) {
      finalScore -= 50;
      errors.push(`مكرر: مشابه لـ ${duplicateCheck.most_similar?.title} بنسبة ${(duplicateCheck.similarity_score*100).toFixed(0)}%`);
    } else if (duplicateCheck.similarity_score > 0.7) {
      finalScore -= 20;
      warnings.push(`تشابه عالي: ${(duplicateCheck.similarity_score*100).toFixed(0)}%`);
    }

    if (!translationCheck.valid) {
      finalScore -= 15;
      warnings.push(...translationCheck.issues);
    }

    if (!safetyCheck.all_safe) {
      finalScore -= 40;
      errors.push(`روابط غير آمنة: ${safetyCheck.unsafe_count}`);
    }

    if (qualityCheck.average_score < 60) {
      finalScore -= 20;
      warnings.push(`جودة منخفضة: ${qualityCheck.average_score}/100`);
    }

    if (qualityCheck.cam_detected > 0) {
      finalScore -= 10;
      warnings.push(`تم اكتشاف نسخ CAM: ${qualityCheck.cam_detected}`);
    }

    finalScore = Math.max(0, finalScore);

    let recommendation;
    let confidence;
    if (finalScore >= 80 && !duplicateCheck.is_duplicate && safetyCheck.all_safe) {
      recommendation = 'AUTO_PUBLISH';
      confidence = 0.9 + Math.random() * 0.1;
    } else if (finalScore >= 60) {
      recommendation = 'MANUAL_REVIEW';
      confidence = 0.6 + Math.random() * 0.3;
    } else {
      recommendation = 'REJECT';
      confidence = 0.8 + Math.random() * 0.2;
    }

    const executionTime = Date.now() - startTime;

    const result = {
      movie_id: movie.id,
      movie_title: movie.title_ar || movie.title,
      final_score: finalScore,
      recommendation,
      confidence: Math.round(confidence * 100) / 100,
      checks: {
        duplicate: duplicateCheck,
        translation: translationCheck,
        safety: safetyCheck,
        quality: qualityCheck
      },
      warnings,
      errors,
      execution_time_ms: executionTime,
      validated_at: new Date().toISOString()
    };

    logger.info('AIValidator', `${recommendation} for ${movie.title} - Score: ${finalScore} - Confidence: ${confidence}`);

    return result;
  }
}

const aiValidator = new AIContentValidator();
export default aiValidator;
