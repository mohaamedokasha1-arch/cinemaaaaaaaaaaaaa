import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clapperboard, Download, Film, Pencil, Plus, Search, ShieldAlert, Star, Trash2, Tv, X, Zap, BarChart3, Settings, Server, Mic, Eye, Activity } from 'lucide-react';
import { useMovies } from '../context/MoviesContext';
import { getSafePosterSrc } from '../utils/media';
import MovieForm from '../components/MovieForm';
import AutomationDashboard from '../components/AutomationDashboard';

export default function AdminDashboard() {
  const { movies, addMovie, updateMovie, deleteMovie, backendStatus, refreshMovies, apiClient } = useMovies();
  const [showForm, setShowForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('movies'); // movies | automation | monitoring
  const cancelRef = useRef(null);

  const filteredMovies = useMemo(() => movies.filter((movie) => `${movie.title || ''} ${movie.titleAr || ''} ${movie.title_ar || ''} ${movie.category || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [movies, query]);
  const countMovies = movies.filter((movie) => movie.type !== 'series').length;
  const countSeries = movies.filter((movie) => movie.type === 'series').length;
  const topRated = movies.filter((movie) => Number(movie.rating || movie.tmdb_rating) >= 8).length;
  const dubbedCount = movies.filter(m => m.has_arabic_dub).length;
  const totalViews = movies.reduce((sum, m) => sum + (m.view_count || 0), 0);

  useEffect(() => {
    if (!pendingDelete) return;
    cancelRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') setPendingDelete(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingDelete]);

  const scrollToForm = () => requestAnimationFrame(() => document.getElementById('movie-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const startNew = () => { setEditingMovie(null); setShowForm(true); setMessage(''); scrollToForm(); };
  const startEdit = (movie) => { setEditingMovie(movie); setShowForm(true); setMessage(''); scrollToForm(); };
  const cancelForm = () => { setShowForm(false); setEditingMovie(null); };

  const saveMovie = async (data) => {
    try {
      const result = editingMovie ? await updateMovie(editingMovie.id, data) : await addMovie(data);
      const success = editingMovie ? result : result.success;
      if (success) {
        setMessage(editingMovie ? 'تم حفظ التعديلات بنجاح.' : 'تمت إضافة العمل إلى مكتبتك.');
        cancelForm();
        return true;
      }
      setMessage('تعذر الحفظ، حاول مرة أخرى');
      return false;
    } catch (e) {
      setMessage(`خطأ: ${e.message}`);
      return false;
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      if (await deleteMovie(pendingDelete.id)) setMessage('تم حذف العمل من المكتبة.');
      else setMessage('تعذّر حذف العمل. حاول مرة أخرى.');
    } catch (e) {
      setMessage(`خطأ: ${e.message}`);
    }
    setPendingDelete(null);
  };

  const exportMovies = () => {
    const blob = new Blob([JSON.stringify(movies, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'cinema-al-arab-backup.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('بدأ تنزيل النسخة الاحتياطية.');
  };

  const handleFetchEmbeds = async (movie) => {
    try {
      setMessage(`جاري جلب السيرفرات لفيلم: ${movie.titleAr || movie.title}...`);
      await apiClient.fetchEmbeds(movie.id);
      setMessage(`بدأ جلب السيرفرات لـ ${movie.titleAr || movie.title} - سيتم التحديث تلقائياً`);
      setTimeout(refreshMovies, 3000);
    } catch (e) {
      setMessage(`فشل جلب السيرفرات: ${e.message}`);
    }
  };

  return (
    <main className="container-wide admin-page">
      <Link to="/" className="back-link"><ArrowRight size={18} /> العودة إلى الموقع</Link>
      
      <div className="admin-header">
        <div>
          <span className="section-kicker">استوديو سينما العرب • {backendStatus === 'connected' ? 'وضع الأتمتة الكاملة 🤖' : 'وضع محلي'}</span>
          <h1>لوحة <em>التحكم.</em></h1>
          <p>نظّم مكتبتك السينمائية وأدر نظام الأتمتة الكامل من مكان واحد.</p>
        </div>
        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          <button type="button" className="button button--gold" onClick={showForm ? cancelForm : startNew}>{showForm ? <X size={18} /> : <Plus size={19} />}{showForm ? 'إغلاق النموذج' : 'إضافة عمل جديد'}</button>
          <Link to="/admin/monitoring" className="button button--outline"><BarChart3 size={18} /> المراقبة</Link>
        </div>
      </div>

      {/* Backend Status */}
      <div className={`admin-notice ${backendStatus === 'connected' ? 'admin-notice--success' : ''}`}>
        {backendStatus === 'connected' ? <Activity size={20} /> : <ShieldAlert size={20} />}
        <p>
          {backendStatus === 'connected' 
            ? <><strong>🤖 وضع الأتمتة الكاملة نشط:</strong> متصل بالخادم الخلفي - جميع الوحدات الخمس تعمل، قاعدة بيانات مشتركة، مزامنة تلقائية كل 3 ساعات.</>
            : <><strong>وضع تجريبي:</strong> التغييرات وبيانات الدخول محفوظة في متصفحك فقط، ولا تظهر للزوار الآخرين. شغّل <code>npm run build && npm start</code> لتفعيل الأتمتة الكاملة.</>
          }
        </p>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button type="button" className={`admin-tab ${activeTab === 'movies' ? 'admin-tab--active' : ''}`} onClick={() => setActiveTab('movies')}>
          <Film size={16} /> إدارة الأفلام ({movies.length})
        </button>
        <button type="button" className={`admin-tab ${activeTab === 'automation' ? 'admin-tab--active' : ''}`} onClick={() => setActiveTab('automation')}>
          <Zap size={16} /> الأتمتة الكاملة 🤖
        </button>
      </div>

      {activeTab === 'movies' && (
        <>
          <div className="stats-grid">
            <div className="stat-card"><span className="stat-card__icon"><Film size={24} /></span><span>الأفلام</span><strong>{countMovies}</strong><small>فيلم في المجموعة</small></div>
            <div className="stat-card"><span className="stat-card__icon stat-card__icon--blue"><Tv size={24} /></span><span>المسلسلات</span><strong>{countSeries}</strong><small>مسلسل في المجموعة</small></div>
            <div className="stat-card"><span className="stat-card__icon stat-card__icon--rose"><Star size={24} /></span><span>الأعمال المميزة</span><strong>{topRated}</strong><small>بتقييم 8 أو أكثر</small></div>
            <div className="stat-card"><span className="stat-card__icon" style={{background: '#2a3320', color: '#a8d5a8'}}><Mic size={24} /></span><span>مدبلج عربي</span><strong>{dubbedCount}</strong><small>فيلم مدبلج</small></div>
            <div className="stat-card"><span className="stat-card__icon" style={{background: '#2a2a33', color: '#b8b8ff'}}><Eye size={24} /></span><span>المشاهدات</span><strong>{totalViews.toLocaleString()}</strong><small>إجمالي المشاهدات</small></div>
            <div className="stat-card"><span className="stat-card__icon" style={{background: '#332a20', color: '#dfbc7c'}}><Server size={24} /></span><span>حالة الخادم</span><strong>{backendStatus === 'connected' ? 'متصل' : 'محلي'}</strong><small>{backendStatus === 'connected' ? 'أتمتة كاملة' : 'localStorage'}</small></div>
          </div>

          {showForm && <MovieForm key={editingMovie?.id || 'create'} initialMovie={editingMovie} onSave={saveMovie} onCancel={cancelForm} />}
          {message && <div className="admin-message" role="status"><Check size={18} /> {message}<button type="button" aria-label="إغلاق الإشعار" onClick={() => setMessage('')}><X size={16} /></button></div>}

          <section className="admin-library" aria-labelledby="library-title">
            <div className="admin-library__top">
              <div><span className="section-kicker">إدارة المحتوى • {backendStatus === 'connected' ? 'خادم مشترك' : 'متصفح محلي'}</span><h2 id="library-title">قائمة الأعمال <small>({movies.length})</small></h2></div>
              <div className="admin-library__tools">
                <label className="admin-search"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث في المكتبة..." aria-label="البحث في المكتبة" /></label>
                <button type="button" onClick={exportMovies} className="export-button" title="تحميل نسخة JSON من الأعمال"><Download size={17} /> <span>نسخة احتياطية</span></button>
                <button type="button" onClick={refreshMovies} className="export-button" title="تحديث من الخادم"><Settings size={17} /> <span>تحديث</span></button>
              </div>
            </div>
            <div className="admin-table-head" aria-hidden="true"><span>العمل</span><span>النوع</span><span>السنة</span><span>التقييم</span><span>الإجراءات</span></div>
            {filteredMovies.length > 0 ? (
              <ul className="admin-list">{filteredMovies.map((movie) => <li className="admin-row" key={movie.id}>
                <div className="admin-row__movie">
                  <img src={getSafePosterSrc(movie.poster || movie.poster_path) || '/images/poster-fallback.svg'} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = '/images/poster-fallback.svg'; }} />
                  <div>
                    <strong>{movie.titleAr || movie.title_ar || movie.title || 'بدون عنوان'}</strong>
                    <span dir="ltr">{movie.titleAr && movie.title ? movie.title : movie.category}</span>
                    <small>{movie.category || 'غير مصنف'} {movie.has_arabic_dub ? '• 🎙️ مدبلج' : ''} {movie.is_trending ? '• 🔥 رائج' : ''}</small>
                  </div>
                </div>
                <span className="admin-row__type">{movie.type === 'series' ? 'مسلسل' : 'فيلم'}</span>
                <span className="admin-row__year">{movie.year || '—'}</span>
                <span className="admin-row__rating"><Star size={14} fill="currentColor" /> {movie.rating || movie.tmdb_rating || '—'}</span>
                <div className="admin-row__actions">
                  <button type="button" className="edit-button" onClick={() => startEdit(movie)} title={`تعديل ${movie.titleAr || movie.title}`}><Pencil size={17} /><span>تعديل</span></button>
                  <button type="button" className="edit-button" style={{background: '#1e2a3a', color: '#8ab4f8'}} onClick={() => handleFetchEmbeds(movie)} title="جلب السيرفرات"><Server size={17} /><span>سيرفرات</span></button>
                  <button type="button" className="delete-button" onClick={() => setPendingDelete(movie)} title={`حذف ${movie.titleAr || movie.title}`}><Trash2 size={17} /><span>حذف</span></button>
                </div>
              </li>)}</ul>
            ) : <div className="admin-empty"><Clapperboard size={34} /><h3>{query ? 'لا توجد نتائج مطابقة' : 'المكتبة فارغة حاليًا'}</h3><p>{query ? 'جرّب البحث بكلمات أخرى.' : 'ابدأ بإضافة فيلمك أو مسلسلك الأول.'}</p>{query && <button type="button" onClick={() => setQuery('')}>مسح البحث</button>}</div>}
          </section>
        </>
      )}

      {activeTab === 'automation' && (
        <AutomationDashboard />
      )}

      {pendingDelete && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDelete(null); }}><div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" className="confirm-dialog"><div className="confirm-dialog__icon"><Trash2 size={24} /></div><h2 id="delete-title">حذف هذا العمل؟</h2><p id="delete-description">سيُحذف «{pendingDelete.titleAr || pendingDelete.title}» من المكتبة نهائيًا.</p><div><button ref={cancelRef} type="button" className="button button--outline" onClick={() => setPendingDelete(null)}>إلغاء</button><button type="button" className="button button--danger" onClick={confirmDelete}>نعم، احذف العمل</button></div></div></div>}
    </main>
  );
}
