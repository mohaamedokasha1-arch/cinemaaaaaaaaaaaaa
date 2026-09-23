import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpDown, Clapperboard, Heart, Play, SearchX, Sparkles, Star, Tv } from 'lucide-react';
import { useMovies } from '../context/MoviesContext';
import MovieCard from '../components/MovieCard';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';

const tabs = [
  { key: 'all', label: 'جميع الأعمال', icon: Clapperboard },
  { key: 'movie', label: 'أفلام', icon: Play },
  { key: 'series', label: 'مسلسلات', icon: Tv },
  { key: 'favorites', label: 'قائمتي', icon: Heart },
];

function normalize(text) {
  return String(text || '').toLocaleLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670ـ]/g, '').trim();
}

export default function Home() {
  const { movies, favorites } = useMovies();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabValue = searchParams.get('type');
  const activeTab = ['movie', 'series', 'favorites'].includes(tabValue) ? tabValue : 'all';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [sortBy, setSortBy] = useState('curated');

  const pickTab = (key) => {
    setSearchParams(key === 'all' ? {} : { type: key });
    setSelectedCategory('الكل');
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tabMovies = useMemo(() => {
    if (activeTab === 'movie') return movies.filter((movie) => movie.type !== 'series');
    if (activeTab === 'series') return movies.filter((movie) => movie.type === 'series');
    if (activeTab === 'favorites') return movies.filter((movie) => favorites.includes(movie.id));
    return movies;
  }, [activeTab, favorites, movies]);

  const categories = useMemo(() => ['الكل', ...new Set(tabMovies.map((movie) => movie.category).filter(Boolean))], [tabMovies]);

  const filteredMovies = useMemo(() => {
    const query = normalize(searchTerm);
    const filtered = tabMovies.filter((movie) => {
      const searchable = normalize(`${movie.title} ${movie.titleAr} ${movie.category} ${movie.description}`);
      return (!query || searchable.includes(query)) && (selectedCategory === 'الكل' || movie.category === selectedCategory);
    });
    if (sortBy === 'rating') filtered.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    else if (sortBy === 'newest') filtered.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    else if (sortBy === 'oldest') filtered.sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0));
    return filtered;
  }, [tabMovies, searchTerm, selectedCategory, sortBy]);

  const featured = movies.find((movie) => movie.id === 'dark-knight') || movies[0];
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
      </div>

      <section className="container-wide catalog" id="catalog" aria-labelledby="catalog-heading">
        <div className="section-heading">
          <div><span className="section-kicker">اكتشف مجموعتنا</span><h2 id="catalog-heading">ماذا ستشاهد <em>اليوم؟</em></h2><p>تصفّح المجموعة وابحث عمّا يناسب مزاجك.</p></div>
          <span className="section-count">{movies.length} عمل في المكتبة <span className="section-count__dot" /></span>
        </div>

        <div className="catalog-controls">
          <div className="catalog-tabs" role="group" aria-label="نوع الأعمال">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" className={`catalog-tab ${activeTab === key ? 'catalog-tab--active' : ''}`} onClick={() => pickTab(key)} aria-pressed={activeTab === key}>
                <Icon size={17} fill={key === 'favorites' && activeTab === key ? 'currentColor' : 'none'} /> {label}
                {key === 'favorites' && favorites.length > 0 && <small>{favorites.length}</small>}
              </button>
            ))}
          </div>
          <div className="catalog-tools">
            <SearchBar value={searchTerm} onChange={setSearchTerm} />
            <label className="sort-field"><ArrowUpDown size={17} aria-hidden="true" /><span className="sr-only">ترتيب النتائج</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="ترتيب النتائج"><option value="curated">ترتيبنا</option><option value="rating">الأعلى تقييماً</option><option value="newest">الأحدث إنتاجاً</option><option value="oldest">الأقدم إنتاجاً</option></select></label>
          </div>
        </div>

        <CategoryFilter categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

        <div className="results-bar"><h3>{activeTab === 'favorites' ? 'قائمتي المفضلة' : activeTab === 'series' ? 'المسلسلات' : activeTab === 'movie' ? 'الأفلام' : 'جميع الأعمال'}</h3><span>{filteredMovies.length} نتيجة</span></div>

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
