import React, { useState, useEffect } from 'react';
import { Play, Server, Subtitles, Mic, Zap, Clock, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { getTrustedEmbedSrc, getSafeMediaSrc, getSafePosterSrc } from '../utils/media';

export default function EmbedPlayer({ movie, servers = [], initialServer = null }) {
  const [activeServer, setActiveServer] = useState(initialServer || servers[0] || null);
  const [playerStarted, setPlayerStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (servers.length > 0 && !activeServer) {
      // أولوية للمدبلج العربي
      const arabicDub = servers.find(s => s.has_arabic_dub || s.isDubbed);
      setActiveServer(arabicDub || servers[0]);
    }
  }, [servers]);

  useEffect(() => {
    setPlayerStarted(false);
    setIsLoading(false);
  }, [activeServer?.id, activeServer?.embed_url]);

  const directVideo = getSafeMediaSrc(movie?.videoUrl);
  const poster = getSafePosterSrc(movie?.poster) || '/images/poster-fallback.svg';
  const title = movie?.titleAr || movie?.title || 'فيلم';

  // إذا كان فيديو مباشر
  if (directVideo) {
    const subtitles = getSafeMediaSrc(movie?.subtitleUrl);
    return (
      <div className="player-shell">
        <video
          key={directVideo}
          controls
          playsInline
          preload="metadata"
          poster={poster}
          crossOrigin={subtitles ? 'anonymous' : undefined}
          aria-label={`مشغّل ${title}`}
        >
          <source src={directVideo} />
          {subtitles && <track kind="subtitles" src={subtitles} srcLang="ar" label="العربية" default />}
          المتصفح لا يدعم تشغيل هذا الفيديو.
        </video>
      </div>
    );
  }

  // تحديد رابط التشغيل
  let embedSrc = null;
  let isExternalEmbed = false;

  if (activeServer?.embed_url) {
    // تحقق إذا كان الرابط من مصادر التضمين المدعومة
    const trusted = getTrustedEmbedSrc(activeServer.embed_url);
    if (trusted) {
      embedSrc = trusted;
    } else {
      // روابط التضمين الخارجية (VidSrc, 2Embed, إلخ)
      // نعرضها مباشرة في iframe مع تحقق أمان
      if (activeServer.embed_url.startsWith('https://')) {
        embedSrc = activeServer.embed_url;
        isExternalEmbed = true;
      }
    }
  } else if (movie?.embedCode) {
    embedSrc = getTrustedEmbedSrc(movie.embedCode);
  }

  const handleServerChange = (server) => {
    setIsLoading(true);
    setActiveServer(server);
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div className="embed-player-container">
      {/* Server Selector */}
      {servers.length > 0 && (
        <div className="server-selector">
          <div className="server-selector__header">
            <Server size={16} />
            <span>اختر السيرفر ({servers.length} سيرفر متاح)</span>
            <span className="server-selector__hint">الأولوية للمحتوى العربي</span>
          </div>
          
          <div className="server-list">
            {servers.map((server) => (
              <button
                key={server.id}
                type="button"
                className={`server-pill ${activeServer?.id === server.id ? 'server-pill--active' : ''} ${server.has_arabic_dub ? 'server-pill--dubbed' : ''}`}
                onClick={() => handleServerChange(server)}
                title={`${server.server_name} - ${server.quality}`}
              >
                <span className="server-pill__name">
                  {server.has_arabic_dub && <Mic size={12} />}
                  {server.has_arabic_subs && !server.has_arabic_dub && <Subtitles size={12} />}
                  {server.server_name}
                </span>
                <span className="server-pill__meta">
                  <span className={`quality-badge quality-${(server.quality || 'hd').toLowerCase()}`}>
                    {server.quality || 'HD'}
                  </span>
                  {server.response_time_ms && (
                    <span className="response-time">
                      <Clock size={10} />
                      {server.response_time_ms}ms
                    </span>
                  )}
                  {server.is_verified && <CheckCircle size={12} className="verified-icon" />}
                </span>
              </button>
            ))}
          </div>

          {activeServer && (
            <div className="active-server-info">
              <span>
                السيرفر النشط: <strong>{activeServer.server_name}</strong>
                {activeServer.has_arabic_dub && <span className="dub-badge">🎙️ مدبلج عربي</span>}
                {activeServer.has_arabic_subs && <span className="sub-badge">💬 مترجم</span>}
              </span>
              <a href={activeServer.embed_url} target="_blank" rel="noopener noreferrer" className="external-link">
                فتح في تبويب جديد <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Player */}
      <div className="player-shell" id="player">
        {isLoading ? (
          <div className="player-loading">
            <div className="spinner" />
            <span>جاري تحميل السيرفر...</span>
          </div>
        ) : embedSrc && !playerStarted ? (
          <div className="player-preview">
            <img className="player-preview__background" src={poster} alt="" aria-hidden="true" />
            <div className="player-preview__inner">
              <div className="player-preview__details">
                <span>
                  سينما العرب <span aria-hidden="true">/</span> 
                  {activeServer?.has_arabic_dub ? ' مدبلج عربي' : ' مترجم'}
                </span>
                <h2>{title}</h2>
                <p>
                  {activeServer ? `تشغيل عبر ${activeServer.server_name} بجودة ${activeServer.quality}` : 'شاهد لمحة من الحكاية قبل أن تبدأ.'}
                </p>
                <button
                  type="button"
                  className="player-preview__cta"
                  onClick={() => setPlayerStarted(true)}
                  aria-label={`تشغيل: ${title}`}
                >
                  <span><Play size={20} fill="currentColor" /></span> 
                  تشغيل الآن
                  {activeServer?.has_arabic_dub && ' - مدبلج'}
                </button>
                {activeServer && (
                  <div className="player-preview__server-info">
                    <Zap size={14} />
                    <span>{activeServer.server_name} • {activeServer.quality} • {activeServer.language}</span>
                  </div>
                )}
              </div>
              <img className="player-preview__poster" src={poster} alt="" aria-hidden="true" />
            </div>
          </div>
        ) : embedSrc ? (
          <iframe
            title={`مشغل: ${title} - ${activeServer?.server_name || 'افتراضي'}`}
            src={`${embedSrc}${embedSrc.includes('?') ? '&' : '?'}autoplay=1`}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
          />
        ) : (
          <div className="player-empty">
            <AlertCircle size={38} />
            <strong>لا يوجد سيرفر متاح حالياً</strong>
            <p>جاري البحث عن سيرفرات جديدة لهذا الفيلم...</p>
            <div className="player-empty__actions">
              <button type="button" className="button button--outline" onClick={() => window.location.reload()}>
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="player-footnote">
        <span className="player-footnote__dot" />
        <span>
          {directVideo 
            ? 'فيديو مضاف من لوحة الإدارة.'
            : activeServer 
              ? `يتم التشغيل عبر ${activeServer.server_name} - الجودة: ${activeServer.quality} - ${activeServer.has_arabic_dub ? 'مدبلج عربي' : activeServer.has_arabic_subs ? 'مترجم عربي' : 'متعدد اللغات'}`
              : 'الفيديو المعروض مقطع دعائي للتجربة.'}
        </span>
        {embedSrc && <a href={embedSrc} target="_blank" rel="noopener noreferrer">فتح المشغل <ExternalLink size={14} /></a>}
      </div>
    </div>
  );
}
