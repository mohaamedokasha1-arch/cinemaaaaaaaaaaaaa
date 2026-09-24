import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock3, ExternalLink, Heart, Link2, Play, Star, VideoOff, Mic, Subtitles, Server, Eye, Zap } from 'lucide-react';
import { useMovies } from '../context/MoviesContext';
import { getSafeMediaSrc, getSafePosterSrc, getTrustedEmbedSrc, safeText } from '../utils/media';
import MovieCard from '../components/MovieCard';
import EmbedPlayer from '../components/EmbedPlayer';
import apiClient from '../utils/api';

export default function WatchPage() {
  const { id } = useParams();
  const { movies, favorites, toggleFavorite } = useMovies();
  const [shareMessage, setShareMessage] = useState('');
  const [servers, setServers] = useState([]);
  const [loadingServers, setLoadingServers] = useState(true);
  const [movieDetails, setMovieDetails] = useState(null);

  const localMovie = movies.find((item) => item.id === id);
  
  // Fetch full movie details + servers from backend
  useEffect(() => {
    const fetchDetails = async () => {
      setLoadingServers(true);
      try {
        const fullMovie = await apiClient.getMovieById(id);
        if (fullMovie) {
          setMovieDetails(fullMovie);
          if (fullMovie.servers) {
            setServers(fullMovie.servers);
          } else {
            const srv = await apiClient.getMovieServers(id);
            setServers(srv);
          }
          // Count view
          apiClient.incrementView(id).catch(() => {});
        } else {
          // Fallback servers
          const srv = await apiClient.getMovieServers(id);
          setServers(srv);
        }
      } catch {
        const srv = await apiClient.getMovieServers(id);
        setServers(srv);
      } finally {
        setLoadingServers(false);
      }
    };

    fetchDetails();
    setShareMessage('');
  }, [id]);

  const movie = movieDetails || localMovie;

  if (!movie && !loadingServers) {
    return (
      <main className="container-wide page-missing"><VideoOff size={45} /><h1>هذا العمل غير موجود</h1><p>ربما تم حذفه من المكتبة أو تغيّر رابطه.</p><Link to="/" className="button button--gold">العودة للمكتبة <ArrowRight size={17} /></Link></main>
    );
  }

  if (!movie) {
    return (
      <main className="container-wide watch-page">
        <div className="loading-state">
          <div className="spinner" />
          <span>جاري تحميل بيانات الفيلم...</span>
        </div>
      </main>
    );
  }

  const title = movie.titleAr || movie.title_ar || movie.title || 'عمل بدون عنوان';
  const titleEn = movie.title_en || movie.title || '';
  const poster = getSafePosterSrc(movie.poster || movie.poster_path) || '/images/poster-fallback.svg';
  const isFavorite = favorites.includes(movie.id);
  const related = movies.filter((item) => item.id !== movie.id).sort((a, b) => Number(b.category === movie.category) - Number(a.category === movie.category)).slice(0, 5);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
        setShareMessage('تمت مشاركة الرابط');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setShareMessage('تم نسخ الرابط');
      } else {
        setShareMessage('انسخ الرابط من شريط العنوان');
      }
    } catch (error) {
      if (error.name !== 'AbortError') setShareMessage('تعذّرت مشاركة الرابط');
    }
  };

  return (
    <main className="container-wide watch-page">
      <nav className="breadcrumbs" aria-label="مسار التصفح"><Link to="/">الرئيسية</Link><span>/</span><Link to={movie.type === 'series' ? '/?type=series' : '/?type=movie'}>{movie.type === 'series' ? 'المسلسلات' : 'الأفلام'}</Link><span>/</span><span aria-current="page">{title}</span></nav>
      <Link className="back-link" to={movie.type === 'series' ? '/?type=series' : '/?type=movie'}><ArrowRight size={18} /> العودة إلى المكتبة</Link>

      <div className="watch-heading">
        <div>
          <span className="section-kicker">
            {movie.type === 'series' ? 'مسلسل · اكتشف التفاصيل' : 'فيلم · اكتشف التفاصيل'}
            {movie.has_arabic_dub && <span className="dub-badge-inline"> • 🎙️ مدبلج عربي</span>}
            {movie.is_trending && <span className="trending-badge-inline"> • 🔥 رائج</span>}
          </span>
          <h1>{title}</h1>
          {titleEn && titleEn !== title && <p dir="ltr">{titleEn}</p>}
          {movie.tmdb_id && <small style={{color: '#9a9896'}}>TMDB: {movie.tmdb_id} • IMDb: {movie.imdb_id || '—'}</small>}
        </div>
        <button type="button" className={`watch-favorite ${isFavorite ? 'watch-favorite--active' : ''}`} onClick={() => toggleFavorite(movie.id)} aria-pressed={isFavorite}><Heart size={19} fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'في قائمتي' : 'أضف إلى قائمتي'}</button>
      </div>

      <div className="watch-layout">
        <div className="watch-main">
          {/* Enhanced Player with Multi-Servers */}
          {loadingServers ? (
            <div className="player-shell" style={{display: 'grid', placeItems: 'center', color: '#dfbc7c'}}>
              <div style={{textAlign: 'center'}}>
                <div className="spinner" />
                <p style={{marginTop: 12}}>جاري تحميل السيرفرات...</p>
                <small style={{color: '#9a9896'}}>يتم البحث في 10 مصادر مختلفة</small>
              </div>
            </div>
          ) : (
            <EmbedPlayer movie={movie} servers={servers} />
          )}

          <div className="watch-story">
            <span className="section-kicker">عن العمل</span>
            <h2>القصة</h2>
            <p>{movie.description || movie.overview_ar || movie.overview_en || 'لا يتوفر وصف لهذا العمل بعد.'}</p>
            
            {movie.meta_description && (
              <div className="seo-preview">
                <small style={{color: '#9a9896'}}>SEO: {movie.meta_description}</small>
              </div>
            )}

            <div style={{display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap'}}>
              <button type="button" className="share-link" onClick={share}><Link2 size={16} /> مشاركة هذا العمل</button>
              {movie.has_arabic_dub && <span className="feature-badge"><Mic size={14} /> مدبلج عربي متاح</span>}
              {movie.has_arabic_subs && <span className="feature-badge"><Subtitles size={14} /> مترجم</span>}
              {servers.length > 0 && <span className="feature-badge"><Server size={14} /> {servers.length} سيرفر</span>}
              {movie.view_count > 0 && <span className="feature-badge"><Eye size={14} /> {movie.view_count} مشاهدة</span>}
            </div>
            {shareMessage && <span className="share-message" role="status">{shareMessage}</span>}
          </div>

          {/* Servers Detailed List */}
          {servers.length > 0 && (
            <div className="servers-detail-section">
              <h3><Server size={18} /> السيرفرات المتاحة ({servers.length})</h3>
              <p style={{color: '#9a9896', fontSize: 12}}>الأولوية للمحتوى العربي المدبلج، ثم المترجم، ثم المتعدد</p>
              <div className="servers-table">
                {servers.map((srv, idx) => (
                  <div key={srv.id} className="server-row">
                    <span className="server-row__num">#{idx + 1}</span>
                    <span className="server-row__name">
                      {srv.has_arabic_dub && '🎙️ '}
                      {srv.server_name}
                      {srv.is_verified && ' ✓'}
                    </span>
                    <span className="server-row__quality">{srv.quality}</span>
                    <span className="server-row__lang">{srv.language}</span>
                    <span className="server-row__time">{srv.response_time_ms}ms</span>
                    <span className={`server-row__status ${srv.is_active ? 'active' : 'inactive'}`}>
                      {srv.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="watch-sidebar" aria-label="معلومات العمل">
          <div className="watch-sidebar__poster"><img src={poster} alt={`ملصق ${title}`} onError={(event) => { event.currentTarget.src = '/images/poster-fallback.svg'; }} /></div>
          <div className="watch-sidebar__content">
            <span className="section-kicker">تفاصيل العمل</span>
            <h2>{title}</h2>
            <p>{titleEn}</p>
            
            <div className="detail-divider" />
            <div className="detail-row"><span><CalendarDays size={17} /> سنة الإنتاج</span><strong>{movie.year || '—'}</strong></div>
            <div className="detail-row"><span><Play size={17} /> النوع</span><strong>{movie.type === 'series' ? 'مسلسل' : 'فيلم'}</strong></div>
            <div className="detail-row"><span><Clock3 size={17} /> المدة</span><strong>{movie.duration || (movie.runtime ? `${movie.runtime} دقيقة` : '—')}</strong></div>
            <div className="detail-row"><span>التصنيف</span><strong>{movie.category || movie.genres?.[0] || 'غير مصنّف'}</strong></div>
            {(movie.rating || movie.tmdb_rating) && <div className="detail-row"><span><Star size={17} /> التقييم</span><strong className="detail-rating"><Star size={15} fill="currentColor" /> {movie.rating || movie.tmdb_rating} <small>/ 10</small></strong></div>}
            {movie.view_count > 0 && <div className="detail-row"><span><Eye size={17} /> المشاهدات</span><strong>{movie.view_count}</strong></div>}
            
            <div className="detail-divider" />
            
            <div className="detail-row"><span><Subtitles size={17} /> الترجمة</span><strong>{movie.has_arabic_subs ? 'عربي ✓' : 'غير متوفر'}</strong></div>
            <div className="detail-row"><span><Mic size={17} /> الدبلجة</span><strong>{movie.has_arabic_dub ? 'عربي ✓' : 'غير متوفر'}</strong></div>
            <div className="detail-row"><span><Server size={17} /> السيرفرات</span><strong>{servers.length} سيرفر</strong></div>
            
            {movie.director && <><div className="detail-divider" /><div className="detail-row"><span>المخرج</span><strong>{movie.director}</strong></div></>}
            
            <div className="detail-divider" />
            <p className="watch-sidebar__note">
              {movie.has_arabic_dub ? '🎙️ هذا الفيلم متوفر مدبلج بالعربية مع أولوية عرض عالية.' : ''}
              <br />أضِف هذا العمل إلى قائمتك لترجع إليه في أي وقت.
            </p>

            {movie.tmdb_id && (
              <div style={{marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                <a href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`} target="_blank" rel="noopener noreferrer" className="button button--outline" style={{fontSize: 11, minHeight: 32, padding: '4px 10px'}}>
                  TMDB <ExternalLink size={12} />
                </a>
                {movie.imdb_id && (
                  <a href={`https://www.imdb.com/title/${movie.imdb_id}`} target="_blank" rel="noopener noreferrer" className="button button--outline" style={{fontSize: 11, minHeight: 32, padding: '4px 10px'}}>
                    IMDb <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && <section className="related-section"><div className="section-heading"><div><span className="section-kicker">قد يعجبك أيضًا</span><h2>حكايات <em>أخرى</em></h2></div><Link to="/" className="text-link">عرض المكتبة <ArrowRight size={16} /></Link></div><div className="movies-grid">{related.map((item) => <MovieCard key={item.id} movie={item} />)}</div></section>}
    </main>
  );
}
