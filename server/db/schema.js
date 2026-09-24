/**
 * 🗄️ تصميم قاعدة البيانات المحسّنة - Optimized Database Schema
 * يطبق التصميم المقترح في المخطط الهندسي
 */

export const MOVIE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PENDING_EMBED: 'pending_embed',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
};

export const SERVER_QUALITY = {
  CAM: 'CAM',
  TS: 'TS',
  TC: 'TC',
  HD: 'HD',
  P720: '720p',
  P1080: '1080p',
  FOUR_K: '4K',
  AUTO: 'AUTO'
};

export const SERVER_TYPE = {
  EMBED: 'embed',
  DIRECT: 'direct',
  TORRENT: 'torrent'
};

// نموذج الفيلم الكامل حسب المواصفات
export function createMovieModel(data = {}) {
  const now = new Date().toISOString();
  return {
    // المعرّفات الأساسية
    id: data.id || `movie_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tmdb_id: data.tmdb_id || null,
    imdb_id: data.imdb_id || null,

    // المعلومات الأساسية (متوافقة مع الواجهة القديمة + الجديدة)
    title: data.title || data.title_en || '',
    title_en: data.title_en || data.title || '',
    title_ar: data.title_ar || data.titleAr || data.title || '',
    titleAr: data.titleAr || data.title_ar || data.title || '', // للتوافق
    slug: data.slug || generateSlug(data.title_ar || data.titleAr || data.title),

    year: data.year ? parseInt(data.year) : new Date().getFullYear(),
    runtime: data.runtime || null,
    release_date: data.release_date || null,
    type: data.type || 'movie', // movie | series
    category: data.category || data.genres?.[0] || 'دراما',

    // المحتوى النصي
    overview_en: data.overview_en || data.description || '',
    overview_ar: data.overview_ar || data.description || '',
    description: data.description || data.overview_ar || '',
    tagline_en: data.tagline_en || '',
    tagline_ar: data.tagline_ar || '',

    // الوسائط
    poster: data.poster || data.poster_path || '/images/poster-fallback.svg',
    poster_path: data.poster_path || data.poster || '',
    poster_cdn_url: data.poster_cdn_url || data.poster || '',
    backdrop_path: data.backdrop_path || '',
    backdrop_cdn_url: data.backdrop_cdn_url || '',
    trailer_youtube_id: data.trailer_youtube_id || extractYoutubeId(data.embedCode) || '',

    // التقييمات
    tmdb_rating: data.tmdb_rating || parseFloat(data.rating) || 0,
    tmdb_vote_count: data.tmdb_vote_count || 0,
    imdb_rating: data.imdb_rating || parseFloat(data.rating) || 0,
    imdb_vote_count: data.imdb_vote_count || 0,
    rt_rating: data.rt_rating || null,
    rating: data.rating || String(data.tmdb_rating || 0),

    // التصنيفات
    genres: data.genres || (data.category ? [data.category] : ['دراما']),
    countries: data.countries || ['US'],
    languages: data.languages || ['en', 'ar'],
    production_companies: data.production_companies || [],

    // طاقم العمل
    director: data.director || '',
    director_ar: data.director_ar || '',
    cast: data.cast || [],

    // المحتوى العربي
    has_arabic_dub: data.has_arabic_dub || false,
    has_arabic_subs: data.has_arabic_subs || false,
    arabic_dub_quality: data.arabic_dub_quality || null,

    // الحالة والنشر
    status: data.status || MOVIE_STATUS.PUBLISHED,
    is_trending: data.is_trending || false,
    is_featured: data.is_featured || false,
    is_new: data.is_new || isNewMovie(data.createdAt || now),

    // الإحصائيات
    view_count: data.view_count || 0,
    like_count: data.like_count || 0,
    favorite_count: data.favorite_count || 0,
    share_count: data.share_count || 0,

    // SEO
    meta_description: data.meta_description || generateMetaDescription(data),
    meta_keywords: data.meta_keywords || generateKeywords(data),
    seo_score: data.seo_score || 0,

    // روابط التشغيل (للتوافق مع القديم)
    embedCode: data.embedCode || '',
    videoUrl: data.videoUrl || '',
    subtitleUrl: data.subtitleUrl || '',

    // التواريخ
    createdAt: data.createdAt || now,
    created_at: data.created_at || now,
    updated_at: data.updated_at || now,
    published_at: data.published_at || now,
    last_sync_at: data.last_sync_at || now,
    duration: data.duration || (data.runtime ? `${data.runtime} دقيقة` : '120 دقيقة')
  };
}

export function createServerModel(data = {}) {
  const now = new Date().toISOString();
  return {
    id: data.id || `srv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    movie_id: data.movie_id,
    server_name: data.server_name || 'VidSrc',
    server_type: data.server_type || SERVER_TYPE.EMBED,
    embed_url: data.embed_url || data.url || '',

    quality: data.quality || SERVER_QUALITY.HD,
    resolution_width: data.resolution_width || 1920,
    resolution_height: data.resolution_height || 1080,

    language: data.language || 'multi',
    has_arabic_subs: data.has_arabic_subs || false,
    has_arabic_dub: data.has_arabic_dub || false,
    has_english_subs: data.has_english_subs || false,
    isDubbed: data.isDubbed || data.has_arabic_dub || false,

    is_active: data.is_active !== undefined ? data.is_active : true,
    is_verified: data.is_verified || false,
    response_time_ms: data.response_time_ms || 0,
    uptime_percentage: data.uptime_percentage || 100,

    priority: data.priority || 5,
    sort_order: data.sort_order || 0,

    last_checked: data.last_checked || now,
    last_online: data.last_online || now,
    failed_checks: data.failed_checks || 0,

    user_agent: data.user_agent || 'Mozilla/5.0',
    referer: data.referer || '',
    headers_required: data.headers_required || {},

    created_at: data.created_at || now,
    updated_at: data.updated_at || now
  };
}

export function createSyncLogModel(data = {}) {
  return {
    id: data.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    module_name: data.module_name || 'Unknown',
    job_type: data.job_type || 'general',
    status: data.status || 'running',
    movies_processed: data.movies_processed || 0,
    movies_added: data.movies_added || 0,
    movies_updated: data.movies_updated || 0,
    movies_failed: data.movies_failed || 0,
    servers_added: data.servers_added || 0,
    servers_validated: data.servers_validated || 0,
    servers_removed: data.servers_removed || 0,
    start_time: data.start_time || new Date().toISOString(),
    end_time: data.end_time || null,
    execution_time_ms: data.execution_time_ms || 0,
    errors: data.errors || [],
    warnings: data.warnings || [],
    summary: data.summary || {}
  };
}

// Helpers
function generateSlug(title) {
  if (!title) return `movie-${Date.now()}`;
  return title
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) + `-${Date.now().toString(36)}`;
}

function extractYoutubeId(url) {
  if (!url) return '';
  try {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : '';
    }
  } catch {}
  return '';
}

function generateMetaDescription(data) {
  const title = data.title_ar || data.titleAr || data.title || 'فيلم';
  const year = data.year || new Date().getFullYear();
  const rating = data.rating || data.tmdb_rating || '7.5';
  const desc = (data.overview_ar || data.description || '').slice(0, 80);
  return `شاهد فيلم ${title} (${year}) HD مترجم اون لاين. ${desc}. تقييم IMDb: ${rating}/10. مشاهدة وتحميل مباشر على سينما العرب.`;
}

function generateKeywords(data) {
  const keys = [
    data.title_ar, data.titleAr, data.title,
    data.category,
    data.director,
    ...(data.cast || []).slice(0, 3).map(c => c.name || c),
    data.year,
    'فيلم', 'مشاهدة', 'تحميل', 'اون لاين', 'مترجم', 'مدبلج'
  ].filter(Boolean);
  return [...new Set(keys)].join(', ');
}

function isNewMovie(createdAt) {
  if (!createdAt) return true;
  const created = new Date(createdAt);
  const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

export function validateMovieData(data) {
  const errors = [];
  if (!data.tmdb_id && !data.title && !data.title_ar && !data.titleAr) {
    errors.push('العنوان مطلوب');
  }
  if (data.year && (data.year < 1800 || data.year > 2100)) {
    errors.push('سنة غير صحيحة');
  }
  return { valid: errors.length === 0, errors };
}
