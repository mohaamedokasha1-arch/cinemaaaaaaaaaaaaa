import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpDown, Clapperboard, Heart, Play, SearchX, Sparkles, Star, Tv, Mic, Zap, TrendingUp } from 'lucide-react';
import { useMovies } from '../context/MoviesContext';
import MovieCard from '../components/MovieCard';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import apiClient from '../utils/api';

const tabs = [
  { key: 'all', label: 'جميع الأعمال', icon: Clapperboard },
  { key: 'movie', label: 'أفلام', icon: Play },
  { key: 'series', label: 'مسلسلات', icon: Tv },
  { key: 'favorites', label: 'قائمتي', icon: Heart },
  { key: 'dubbed', label: 'مدبلج عربي', icon: Mic },
  { key: 'trending', label: 'الرائج', icon: TrendingUp },
];

function normalize(text) {
  return String(text || '').toLocaleLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670ـ]/g, '').trim();
}

export default function Home() {
  const { movies, favorites, backendStatus, refreshMovies } = useMovies();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabValue = searchParams.get('type');
  const activeTab = ['movie', 'series', 'favorites', 'dubbed', 'trending'].includes(tabValue) ? tabValue : 'all';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [sortBy, setSortBy] = useState('curated');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiClient.getAutomationStats().then(setStats).catch(() => {});
  }, []);

  const pickTab = (key) => {
    setSearchParams(key === 'all' ? {} : { type: key });
    setSelectedCategory('الكل');
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tabMovies = useMemo(() => {
    if (activeTab === 'movie') return movies.filter((movie) => movie.type !== 'series');
    if (activeTab === 'series') return movies.filter((movie) => movie.type === 'series');
    if (activeTab === 'favorites') return movies.filter((movie) => favorites.includes(movie.id));
    if (activeTab === 'dubbed') return movies.filter((movie) => movie.has_arabic_dub || movie.has_arabic_dub === true);
    if (activeTab === 'trending') return movies.filter((movie) => movie.is_trending);
    return movies;
  }, [activeTab, favorites, movies]);

  const categories = useMemo(() => ['الكل', ...new Set(tabMovies.map((movie) => movie.category).filter(Boolean))], [tabMovies]);

  const filteredMovies = useMemo(() => {
    const query = normalize(searchTerm);
    const filtered = tabMovies.filter((movie) => {
      const searchable = normalize(`${movie.title} ${movie.titleAr} ${movie.category} ${movie.description} ${movie.title_ar || ''}`);
      return (!query || searchable.includes(query)) && (selectedCategory === 'الكل' || movie.category === selectedCategory);
    });
    if (sortBy === 'rating') filtered.sort((a, b) => (Number(b.rating || b.tmdb_rating) || 0) - (Number(a.rating || a.tmdb_rating) || 0));
    else if (sortBy === 'newest') filtered.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    else if (sortBy === 'oldest') filtered.sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0));
    else if (sortBy === 'views') filtered.sort((a, b) => (Number(b.view_count) || 0) - (Number(a.view_count) || 0));
    return filtered;
  }, [tabMovies, searchTerm, selectedCategory, sortBy]);

  const featured = movies.find((movie) => movie.is_trending) || movies.find((movie) => movie.id === 'dark-knight') || movies[0];
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('الكل');
    setSortBy('curated');
    if (activeTab === 'favorites') setSearchParams({});
  };

  return (
    <main>
      <div className="container-wide">
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-line" /> عالم من الحكايات بين يديك</div>
            <h1 id="hero-heading">لأن بعض القصص<br /><span>تستحق أن تُعاش.</span></h1>
            <p>اكتشف عالماً من الأفلام والمسلسلات المختارة، واحتفظ بأعمالك المفضلة في مكان واحد.</p>
            <div className="hero-actions">
              <button type="button" className="button button--gold" onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}>
                استكشف المكتبة <ArrowLeft size={18} strokeWidth={2} />
              </button>
              {featured && <Link to={`/watch/${encodeURIComponent(featured.id)}`} className="button button--ghost"><span className="hero-play-icon"><Play size={15} fill="currentColor" /></span> اختيار الأسبوع</Link>}
            </div>
          </div>
          <div className="hero-caption"><span className="hero-caption__line" /><span>أضواء خافتة. حكايات لا تُنسى.</span></div>
          <div className="hero-index" aria-hidden="true">01 <span>/ 03</span></div>
        </section>
      </div>

      <div className="container-wide intro-strip" aria-label="مميزات الموقع">
        <span><Sparkles size={17} /> اختيارات تستحق وقتك</span>
        <i aria-hidden="true" />
        <span><Star size={17} /> تجربة مشاهدة أبسط</span>
        <i aria-hidden="true" />
        <span><Heart size={17} /> أعمالك المفضلة في مكان واحد</span>
        <i aria-hidden="true" />
        <span><Mic size={17} /> دبلجة عربية</span>
        <i aria-hidden="true" />
        <span><Zap size={17} /> أتمتة كاملة</span>
        {backendStatus === 'connected' && <><i aria-hidden="true" /><span style={{color: '#a8d5a8'}}><span className="section-count__dot" style={{background: '#a8d5a8'}} /> Backend متصل</span></>}
      </div>

      {stats?.database && (
        <div className="container-wide">
          <div className="stats-bar">
            <span>🎬 {stats.database.total_movies} فيلم</span>
            <span>🔗 {stats.database.active_servers} سيرفر نشط</span>
            <span>🎙️ {stats.database.arabic_dub_count} مدبلج</span>
            <span>📈 {stats.database.trending_count} رائج</span>
            <span>👁️ {stats.database.total_views?.toLocaleString()} مشاهدة</span>
          </div>
        </div>
      )}

      <section className="container-wide catalog" id="catalog" aria-labelledby="catalog-heading">
        <div className="section-heading">
          <div><span className="section-kicker">اكتشف مجموعتنا • {backendStatus === 'connected' ? 'وضع الأتمتة الكاملة' : 'وضع محلي'}</span><h2 id="catalog-heading">ماذا ستشاهد <em>اليوم؟</em></h2><p>تصفّح المجموعة وابحث عمّا يناسب مزاجك. {stats?.database?.arabic_dub_count ? `يوجد ${stats.database.arabic_dub_count} فيلم مدبلج عربي.` : ''}</p></div>
          <span className="section-count">{movies.length} عمل في المكتبة <span className="section-count__dot" /></span>
        </div>

        <div className="catalog-controls">
          <div className="catalog-tabs" role="group" aria-label="نوع الأعمال">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" className={`catalog-tab ${activeTab === key ? 'catalog-tab--active' : ''}`} onClick={() => pickTab(key)} aria-pressed={activeTab === key}>
                <Icon size={17} fill={key === 'favorites' && activeTab === key ? 'currentColor' : 'none'} /> {label}
                {key === 'favorites' && favorites.length > 0 && <small>{favorites.length}</small>}
                {key === 'dubbed' && <small style={{background: 'rgba(223,188,124,.25)'}}>🎙️</small>}
              </button>
            ))}
          </div>
          <div className="catalog-tools">
            <SearchBar value={searchTerm} onChange={setSearchTerm} />
            <label className="sort-field"><ArrowUpDown size={17} aria-hidden="true" /><span className="sr-only">ترتيب النتائج</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="ترتيب النتائج"><option value="curated">ترتيبنا</option><option value="rating">الأعلى تقييماً</option><option value="newest">الأحدث إنتاجاً</option><option value="oldest">الأقدم إنتاجاً</option><option value="views">الأكثر مشاهدة</option></select></label>
          </div>
        </div>

        <CategoryFilter categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

        <div className="results-bar"><h3>{activeTab === 'favorites' ? 'قائمتي المفضلة' : activeTab === 'series' ? 'المسلسلات' : activeTab === 'movie' ? 'الأفلام' : activeTab === 'dubbed' ? 'المدبلج عربي' : activeTab === 'trending' ? 'الأفلام الرائجة' : 'جميع الأعمال'}</h3><span>{filteredMovies.length} نتيجة {backendStatus === 'connected' ? '• من الخادم' : '• محلي'}</span></div>

        {filteredMovies.length > 0 ? (
          <div className="movies-grid">{filteredMovies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">{activeTab === 'favorites' && !searchTerm ? <Heart size={34} /> : <SearchX size={34} />}</div>
            <h3>{activeTab === 'favorites' && !searchTerm ? 'قائمتك تنتظر أول فيلم' : 'لم نجد ما تبحث عنه'}</h3>
            <p>{activeTab === 'favorites' && !searchTerm ? 'اضغط علامة القلب على أي عمل لتحفظه هنا.' : 'جرّب كلمة أخرى أو غيّر التصنيف لتجد المزيد.'}</p>
            <button type="button" className="button button--outline" onClick={clearFilters}>{activeTab === 'favorites' ? 'تصفّح جميع الأعمال' : 'مسح الفلاتر'} <ArrowLeft size={16} /></button>
          </div>
        )}
      </section>

      <div className="container-wide"><aside className="bottom-banner"><div><span>كل حكاية لها وقتها</span><h2>ابحث. اختر. واستمتع.</h2><p>مكتبتك السينمائية على بُعد نقرة واحدة.</p></div><button type="button" className="button button--gold" onClick={() => { clearFilters(); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }); }}>ابدأ الاستكشاف <ArrowLeft size={17} /></button><div className="bottom-banner__symbol" aria-hidden="true"><Clapperboard size={160} strokeWidth={0.8} /></div></aside></div>
    </main>
  );
}
