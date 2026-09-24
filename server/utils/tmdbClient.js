/**
 * 🎬 TMDB API Client - عميل TMDB
 * يجلب البيانات من TMDB مع fallback للـ mock data
 */

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

function getApiKey() {
  return process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || null;
}

async function tmdbFetch(endpoint, params = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('TMDB_API_KEY not configured - using mock mode');
  }

  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('language', 'ar-SA');
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`TMDB error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Mock data generator for demo without API key
function generateMockMovies(count = 20, options = {}) {
  const arabicTitles = [
    'الحارس', 'الظل الأخير', 'رحلة الصحراء', 'قلب المدينة', 'أسرار الليل',
    'الفارس الأسود', 'نور العين', 'طريق الأمل', 'الوعد الأخير', 'حكاية حب',
    'المنتقمون الجدد', 'صوت الصمت', 'أرض الأحلام', 'العودة', 'البداية الجديدة',
    'عاصفة الصحراء', 'نجوم الليل', 'قصة بطل', 'السر المدفون', 'اللقاء الأخير'
  ];
  const englishTitles = [
    'The Guardian', 'Last Shadow', 'Desert Journey', 'Heart of City', 'Night Secrets',
    'Black Knight', 'Light of Eye', 'Road of Hope', 'Final Promise', 'Love Story',
    'New Avengers', 'Sound of Silence', 'Dream Land', 'The Return', 'New Beginning',
    'Desert Storm', 'Night Stars', 'Hero Story', 'Buried Secret', 'Last Meeting'
  ];
  const categories = ['أكشن', 'دراما', 'كوميديا', 'تشويق', 'خيال علمي', 'رعب', 'رومانسي', 'مغامرة'];
  const genres = [
    [{ id: 28, name: 'أكشن' }], [{ id: 18, name: 'دراما' }], [{ id: 35, name: 'كوميديا' }],
    [{ id: 53, name: 'تشويق' }], [{ id: 878, name: 'خيال علمي' }]
  ];

  return Array.from({ length: count }, (_, i) => {
    const idx = i % arabicTitles.length;
    const year = 2020 + Math.floor(Math.random() * 5);
    const tmdbId = 800000 + Math.floor(Math.random() * 200000);
    return {
      id: tmdbId,
      tmdb_id: tmdbId,
      imdb_id: `tt${1000000 + tmdbId}`,
      title: englishTitles[idx],
      title_en: englishTitles[idx],
      title_ar: arabicTitles[idx],
      original_title: englishTitles[idx],
      overview: `فيلم ${arabicTitles[idx]} يحكي قصة مشوقة عن ${categories[i % categories.length]} في إطار درامي مميز.`,
      overview_ar: `في هذا العمل المثير، نعيش قصة ${arabicTitles[idx]} التي تجمع بين ${categories[i % categories.length]} والدراما الإنسانية.`,
      poster_path: `/images/posters/${['dark-knight', 'dune2', 'inception', 'interstellar', 'oppenheimer'][i % 5]}.jpg`,
      backdrop_path: `/images/cinema-hero.jpg`,
      release_date: `${year}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      year,
      vote_average: (6 + Math.random() * 3).toFixed(1),
      vote_count: Math.floor(Math.random() * 10000),
      genre_ids: [28, 18],
      genres: genres[i % genres.length],
      adult: false,
      original_language: i % 3 === 0 ? 'ar' : 'en',
      has_arabic_dub: Math.random() > 0.6,
      has_arabic_subs: true,
      runtime: 90 + Math.floor(Math.random() * 60),
      is_new: i < 5
    };
  });
}

export const tmdbClient = {
  async discoverArabicMovies(page = 1) {
    try {
      // أفلام عربية أو مترجمة
      const data = await tmdbFetch('/discover/movie', {
        with_original_language: 'ar',
        sort_by: 'popularity.desc',
        page,
        region: 'EG'
      });
      return data.results || [];
    } catch (e) {
      console.log('📡 TMDB mock: discoverArabicMovies', e.message);
      return generateMockMovies(20, { lang: 'ar' });
    }
  },

  async getNowPlaying(region = 'EG') {
    try {
      const data = await tmdbFetch('/movie/now_playing', { region, page: 1 });
      return data.results || [];
    } catch (e) {
      console.log('📡 TMDB mock: now_playing');
      return generateMockMovies(15).filter(() => Math.random() > 0.3);
    }
  },

  async getUpcoming(region = 'EG') {
    try {
      const data = await tmdbFetch('/movie/upcoming', { region, page: 1 });
      return data.results || [];
    } catch (e) {
      console.log('📡 TMDB mock: upcoming');
      return generateMockMovies(10);
    }
  },

  async getTrending(timeWindow = 'day') {
    try {
      const data = await tmdbFetch(`/trending/movie/${timeWindow}`, { page: 1 });
      return data.results || [];
    } catch (e) {
      console.log('📡 TMDB mock: trending');
      return generateMockMovies(20).sort(() => 0.5 - Math.random()).slice(0, 10);
    }
  },

  async getMovieDetails(tmdbId) {
    try {
      const movie = await tmdbFetch(`/movie/${tmdbId}`, {
        append_to_response: 'credits,videos,images'
      });
      return {
        ...movie,
        tmdb_id: movie.id,
        title_ar: movie.title, // سيتم ترجمته لاحقاً
        title_en: movie.original_title,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
        runtime: movie.runtime,
        tmdb_rating: movie.vote_average,
        tmdb_vote_count: movie.vote_count,
        genres: movie.genres,
        director: movie.credits?.crew?.find(c => c.job === 'Director')?.name || '',
        cast: movie.credits?.cast?.slice(0, 10) || [],
        trailer_youtube_id: movie.videos?.results?.find(v => v.type === 'Trailer')?.key || ''
      };
    } catch (e) {
      console.log(`📡 TMDB mock: details ${tmdbId}`);
      const mock = generateMockMovies(1)[0];
      return { ...mock, tmdb_id: tmdbId, id: tmdbId };
    }
  },

  async searchMovies(query, year = null) {
    try {
      const params = { query, page: 1, include_adult: false };
      if (year) params.year = year;
      const data = await tmdbFetch('/search/movie', params);
      return data.results || [];
    } catch (e) {
      console.log('📡 TMDB mock: search', query);
      return generateMockMovies(5).filter(m => 
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        m.title_ar.includes(query)
      );
    }
  },

  getImageUrl(path, size = 'w500') {
    if (!path) return '/images/poster-fallback.svg';
    if (path.startsWith('/images/') || path.startsWith('http')) return path;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  },

  // For testing without API key
  generateMockMovies
};
