import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock3, ExternalLink, Heart, Link2, Play, Star, VideoOff } from 'lucide-react';
import { useMovies } from '../context/MoviesContext';
import { getSafeMediaSrc, getSafePosterSrc, getTrustedEmbedSrc } from '../utils/media';
import MovieCard from '../components/MovieCard';

export default function WatchPage() {
  const { id } = useParams();
  const { movies, favorites, toggleFavorite } = useMovies();
  const [shareMessage, setShareMessage] = useState('');
  const [playerStarted, setPlayerStarted] = useState(false);
  const movie = movies.find((item) => item.id === id);
  useEffect(() => { setPlayerStarted(false); setShareMessage(''); }, [id]);

  if (!movie) return (
    <main className="container-wide page-missing"><VideoOff size={45} /><h1>هذا العمل غير موجود</h1><p>ربما تم حذفه من المكتبة أو تغيّر رابطه.</p><Link to="/" className="button button--gold">العودة للمكتبة <ArrowRight size={17} /></Link></main>
  );

  const title = movie.titleAr || movie.title || 'عمل بدون عنوان';
  const directVideo = getSafeMediaSrc(movie.videoUrl);
  const subtitles = directVideo && getSafeMediaSrc(movie.subtitleUrl);
  const embed = getTrustedEmbedSrc(movie.embedCode);
  const poster = getSafePosterSrc(movie.poster) || '/images/poster-fallback.svg';
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

      <div className="watch-heading"><div><span className="section-kicker">{movie.type === 'series' ? 'مسلسل · اكتشف التفاصيل' : 'فيلم · اكتشف التفاصيل'}</span><h1>{title}</h1>{movie.titleAr && movie.title && <p dir="ltr">{movie.title}</p>}</div><button type="button" className={`watch-favorite ${isFavorite ? 'watch-favorite--active' : ''}`} onClick={() => toggleFavorite(movie.id)} aria-pressed={isFavorite}><Heart size={19} fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'في قائمتي' : 'أضف إلى قائمتي'}</button></div>

      <div className="watch-layout">
        <div className="watch-main">
          <div className="player-shell" id="player">
            {directVideo ? (
              <video key={directVideo} controls playsInline preload="metadata" poster={poster} crossOrigin={subtitles ? 'anonymous' : undefined} aria-label={`مشغّل ${title}`}>
                <source src={directVideo} />
                {subtitles && <track kind="subtitles" src={subtitles} srcLang="ar" label="العربية" default />}
                المتصفح لا يدعم تشغيل هذا الفيديو.
              </video>
            ) : embed && !playerStarted ? (
              <div className="player-preview">
                <img className="player-preview__background" src={poster} alt="" aria-hidden="true" />
                <div className="player-preview__inner">
                  <div className="player-preview__details">
                    <span>سينما العرب <span aria-hidden="true">/</span> مقطع دعائي</span>
                    <h2>{title}</h2>
                    <p>شاهد لمحة من الحكاية قبل أن تبدأ.</p>
                    <button type="button" className="player-preview__cta" onClick={() => setPlayerStarted(true)} aria-label={`تشغيل المقطع الدعائي: ${title}`}>
                      <span><Play size={20} fill="currentColor" /></span> تشغيل المقطع الدعائي
                    </button>
                  </div>
                  <img className="player-preview__poster" src={poster} alt="" aria-hidden="true" />
                </div>
              </div>
            ) : embed ? (
              <iframe title={`المقطع الدعائي: ${title}`} src={`${embed}${embed.includes('?') ? '&' : '?'}autoplay=1`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            ) : (
              <div className="player-empty"><VideoOff size={38} /><strong>لا يوجد فيديو متاح حاليًا</strong><p>يمكن إضافة مقطع أو فيديو مرخّص من لوحة الإدارة.</p></div>
            )}
          </div>
          <div className="player-footnote"><span className="player-footnote__dot" /><span>{directVideo ? 'فيديو مضاف من لوحة الإدارة. تتوفر الترجمة إن تم ربط ملف VTT.' : 'الفيديو المعروض مقطع دعائي للتجربة، وليس الفيلم أو الحلقة كاملة.'}</span>{!directVideo && embed && <a href={embed} target="_blank" rel="noopener noreferrer">فتح المقطع <ExternalLink size={14} /></a>}</div>

          <div className="watch-story"><span className="section-kicker">عن العمل</span><h2>القصة</h2><p>{movie.description || 'لا يتوفر وصف لهذا العمل بعد.'}</p><button type="button" className="share-link" onClick={share}><Link2 size={16} /> مشاركة هذا العمل</button>{shareMessage && <span className="share-message" role="status">{shareMessage}</span>}</div>
        </div>
        <aside className="watch-sidebar" aria-label="معلومات العمل">
          <div className="watch-sidebar__poster"><img src={poster} alt={`ملصق ${title}`} onError={(event) => { event.currentTarget.src = '/images/poster-fallback.svg'; }} /></div>
          <div className="watch-sidebar__content"><span className="section-kicker">تفاصيل العمل</span><h2>{title}</h2><p>{movie.title || ''}</p><div className="detail-divider" />
            <div className="detail-row"><span><CalendarDays size={17} /> سنة الإنتاج</span><strong>{movie.year || '—'}</strong></div>
            <div className="detail-row"><span><Play size={17} /> النوع</span><strong>{movie.type === 'series' ? 'مسلسل' : 'فيلم'}</strong></div>
            <div className="detail-row"><span><Clock3 size={17} /> المدة</span><strong>{movie.duration || '—'}</strong></div>
            <div className="detail-row"><span>التصنيف</span><strong>{movie.category || 'غير مصنّف'}</strong></div>
            {movie.rating && <div className="detail-row"><span><Star size={17} /> التقييم</span><strong className="detail-rating"><Star size={15} fill="currentColor" /> {movie.rating} <small>/ 10</small></strong></div>}
            <div className="detail-divider" /><p className="watch-sidebar__note">أضِف هذا العمل إلى قائمتك لترجع إليه في أي وقت.</p>
          </div>
        </aside>
      </div>

      {related.length > 0 && <section className="related-section"><div className="section-heading"><div><span className="section-kicker">قد يعجبك أيضًا</span><h2>حكايات <em>أخرى</em></h2></div><Link to="/" className="text-link">عرض المكتبة <ArrowRight size={16} /></Link></div><div className="movies-grid">{related.map((item) => <MovieCard key={item.id} movie={item} />)}</div></section>}
    </main>
  );
}
