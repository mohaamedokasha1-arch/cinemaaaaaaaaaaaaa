import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Play, Star } from 'lucide-react';
import { useMovies } from '../context/MoviesContext';
import { getSafePosterSrc } from '../utils/media';

export default function MovieCard({ movie }) {
  const { favorites, toggleFavorite } = useMovies();
  const [imageError, setImageError] = useState(false);
  useEffect(() => setImageError(false), [movie.poster]);
  const isFavorite = favorites.includes(movie.id);
  const title = movie.titleAr || movie.title || 'بدون عنوان';
  const source = !imageError && getSafePosterSrc(movie.poster) ? movie.poster : '/images/poster-fallback.svg';

  return (
    <article className="movie-card">
      <div className="movie-card__cover">
        <Link to={`/watch/${encodeURIComponent(movie.id)}`} className="movie-card__poster" aria-label={`تفاصيل ${title}`}>
          <img src={source} alt={`ملصق ${title}`} decoding="async" onError={() => setImageError(true)} />
          <span className="movie-card__shade" aria-hidden="true" />
          <span className="movie-card__play"><Play size={18} fill="currentColor" aria-hidden="true" /> اكتشف العمل</span>
        </Link>
        <span className="movie-card__kind">{movie.type === 'series' ? 'مسلسل' : 'فيلم'}</span>
        {movie.rating && <span className="movie-card__rating" dir="ltr"><Star size={13} fill="currentColor" aria-hidden="true" /> {movie.rating}</span>}
        <button
          type="button"
          className={`movie-card__heart ${isFavorite ? 'movie-card__heart--active' : ''}`}
          onClick={() => toggleFavorite(movie.id)}
          aria-label={isFavorite ? `إزالة ${title} من المفضلة` : `إضافة ${title} إلى المفضلة`}
          aria-pressed={isFavorite}
          title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        ><Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2} /></button>
      </div>
      <div className="movie-card__info">
        <Link to={`/watch/${encodeURIComponent(movie.id)}`} className="movie-card__title" title={title}>{title}</Link>
        <p><span>{movie.year || '—'}</span><span className="movie-card__dot" aria-hidden="true" /><span>{movie.category || 'غير مصنّف'}</span></p>
      </div>
    </article>
  );
}
