import React, { useState } from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import { movieCategories } from '../data/sampleMovies';
import { getSafeMediaSrc, getSafePosterSrc, getTrustedEmbedSrc } from '../utils/media';

const blankMovie = {
  title: '', titleAr: '', type: 'movie', poster: '', year: '', category: '', rating: '', duration: '', description: '', embedCode: '', videoUrl: '', subtitleUrl: '',
};

export default function MovieForm({ initialMovie, onSave, onCancel }) {
  const [data, setData] = useState(() => ({ ...blankMovie, ...initialMovie }));
  const [error, setError] = useState('');
  const editing = Boolean(initialMovie);
  const setField = (event) => {
    const { name, value } = event.target;
    setData((current) => ({ ...current, [name]: value }));
    if (error) setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    if (!getSafePosterSrc(data.poster)) return setError('استخدم رابط صورة HTTPS صالحًا أو مسار صورة محليًا يبدأ بـ /images/.');
    if (data.embedCode && !getTrustedEmbedSrc(data.embedCode)) return setError('المقاطع المضمّنة مدعومة من YouTube وVimeo فقط. الصق رابطًا صالحًا أو كود iframe منهما.');
    if (data.videoUrl && !getSafeMediaSrc(data.videoUrl)) return setError('رابط الفيديو المباشر يجب أن يبدأ بـ https:// أو أن يكون ملفًا محليًا داخل /media/.');
    if (!data.embedCode && !data.videoUrl) return setError('أضف رابط مقطع من YouTube/Vimeo أو رابط فيديو مباشر.');
    if (data.subtitleUrl && !data.videoUrl) return setError('تعمل ملفات الترجمة VTT مع روابط الفيديو المباشر فقط.');
    if (data.subtitleUrl && !getSafeMediaSrc(data.subtitleUrl)) return setError('رابط الترجمة غير صالح. استخدم HTTPS أو ملفًا داخل /media/.');
    if (Number(data.year) < 1895 || Number(data.year) > 2100) return setError('أدخل سنة إنتاج صحيحة.');
    if (data.rating && (Number(data.rating) < 0 || Number(data.rating) > 10)) return setError('يجب أن يكون التقييم بين 0 و10.');
    if (!onSave({ ...data, title: data.title.trim(), titleAr: data.titleAr.trim(), poster: data.poster.trim(), description: data.description.trim(), embedCode: data.embedCode.trim(), videoUrl: data.videoUrl.trim(), subtitleUrl: data.subtitleUrl.trim() })) {
      setError('تعذّر الحفظ في هذا المتصفح. تأكد من وجود مساحة تخزين كافية وحاول مجددًا.');
    }
  };

  return (
    <section className="admin-form-card" id="movie-form" aria-labelledby="movie-form-title">
      <div className="admin-form-card__heading"><div><span className="section-kicker">{editing ? 'تحديث بيانات العمل' : 'أضف إلى مجموعتك'}</span><h2 id="movie-form-title">{editing ? 'تعديل العمل' : 'إضافة عمل جديد'}</h2></div><button type="button" className="icon-close" onClick={onCancel} aria-label="إغلاق النموذج"><X size={20} /></button></div>
      <form onSubmit={submit}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-grid">
          <div className="field"><label htmlFor="movie-title">العنوان الأصلي <span>*</span></label><input id="movie-title" name="title" value={data.title} onChange={setField} placeholder="Interstellar" maxLength={120} required /></div>
          <div className="field"><label htmlFor="movie-title-ar">العنوان بالعربية</label><input id="movie-title-ar" name="titleAr" value={data.titleAr} onChange={setField} placeholder="بين النجوم" maxLength={120} /></div>
          <div className="field"><label htmlFor="movie-type">نوع العمل <span>*</span></label><select id="movie-type" name="type" value={data.type} onChange={setField} required><option value="movie">فيلم</option><option value="series">مسلسل</option></select></div>
          <div className="field"><label htmlFor="movie-category">التصنيف <span>*</span></label><select id="movie-category" name="category" value={data.category} onChange={setField} required><option value="">اختر التصنيف</option>{movieCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
          <div className="field"><label htmlFor="movie-year">سنة الإنتاج <span>*</span></label><input id="movie-year" name="year" type="number" min="1895" max="2100" value={data.year} onChange={setField} placeholder="2024" required /></div>
          <div className="field"><label htmlFor="movie-rating">التقييم من 10</label><input id="movie-rating" name="rating" type="number" min="0" max="10" step="0.1" value={data.rating} onChange={setField} placeholder="8.5" /></div>
          <div className="field"><label htmlFor="movie-duration">المدة أو المواسم</label><input id="movie-duration" name="duration" value={data.duration} onChange={setField} placeholder="120 دقيقة أو 3 مواسم" maxLength={40} /></div>
          <div className="field"><label htmlFor="movie-poster">رابط صورة الملصق <span>*</span></label><input id="movie-poster" name="poster" type="text" dir="ltr" value={data.poster} onChange={setField} placeholder="https://... أو /images/posters/..." required /></div>
          <div className="field field--full"><label htmlFor="movie-description">نبذة عن العمل</label><textarea id="movie-description" name="description" rows="3" value={data.description} onChange={setField} placeholder="ما القصة التي تودّ أن تحكيها؟" maxLength={1200} /></div>
          <div className="form-subheading field--full"><strong>خيارات المشاهدة</strong><p>أضف مقطعًا دعائيًا، أو فيديو مباشرًا مرخّصًا مع ترجمة عربية بصيغة VTT.</p></div>
          <div className="field field--full"><label htmlFor="movie-embed">رابط YouTube أو Vimeo / كود iframe</label><textarea id="movie-embed" name="embedCode" rows="2" dir="ltr" value={data.embedCode} onChange={setField} placeholder="https://www.youtube.com/watch?v=..." /><small>نستخرج رابط المشغّل فقط؛ لا يتم تشغيل كود HTML المُلصق.</small></div>
          <div className="field"><label htmlFor="movie-video">رابط فيديو مباشر (اختياري)</label><input id="movie-video" name="videoUrl" type="text" dir="ltr" value={data.videoUrl} onChange={setField} placeholder="https://example.com/video.mp4" /><small>يتقدّم على المقطع الدعائي عند إضافته.</small></div>
          <div className="field"><label htmlFor="movie-subtitle">رابط ترجمة عربية VTT (اختياري)</label><input id="movie-subtitle" name="subtitleUrl" type="text" dir="ltr" value={data.subtitleUrl} onChange={setField} placeholder="https://example.com/ar.vtt" /><small>يحتاج الفيديو إلى صلاحية CORS لتحميل ترجمة خارجية.</small></div>
        </div>
        <div className="form-actions"><button type="submit" className="button button--gold"><Save size={17} /> {editing ? 'حفظ التعديلات' : 'إضافة العمل'} <ArrowLeft size={16} /></button><button type="button" className="button button--outline" onClick={onCancel}>إلغاء</button></div>
      </form>
    </section>
  );
}
