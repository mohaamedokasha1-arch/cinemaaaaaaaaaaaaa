import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldAlert } from 'lucide-react';
import { useMovies } from '../context/MoviesContext';

export default function AdminLogin() {
  const { isAdmin, login } = useMovies();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (isAdmin) return <Navigate to="/admin" replace />;

  const submit = (event) => {
    event.preventDefault();
    const result = login(username, password);
    if (result.success) {
      const from = location.state?.from;
      navigate(from?.pathname && from.pathname.startsWith('/admin') ? from.pathname : '/admin', { replace: true });
    } else setError(result.message);
  };

  return (
    <main className="container-wide login-page">
      <Link to="/" className="back-link"><ArrowRight size={18} /> العودة إلى الرئيسية</Link>
      <div className="login-layout">
        <section className="login-panel"><div className="login-panel__icon"><LockKeyhole size={25} /></div><span className="section-kicker">منطقة الإدارة</span><h1>أهلاً بك <em>من جديد.</em></h1><p className="login-intro">سجّل دخولك لإدارة مكتبة الأفلام والمسلسلات الخاصة بهذا المتصفح.</p>
          <form onSubmit={submit} className="login-form">
            {error && <div className="form-error" role="alert">{error}</div>}
            <div className="field"><label htmlFor="admin-username">اسم المستخدم</label><input id="admin-username" type="text" autoComplete="username" value={username} onChange={(event) => { setUsername(event.target.value); setError(''); }} placeholder="أدخل اسم المستخدم" required /></div>
            <div className="field"><label htmlFor="admin-password">كلمة المرور</label><div className="password-wrap"><input id="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} placeholder="أدخل كلمة المرور" required /><button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            <button type="submit" className="button button--gold login-submit">الدخول إلى لوحة التحكم <ArrowLeft size={18} /></button>
          </form>
          <div className="demo-credentials"><strong>بيانات الدخول للتجربة</strong><div><span>اسم المستخدم <code dir="ltr">admin</code></span><span>كلمة المرور <code dir="ltr">admin123</code></span></div></div>
          <div className="login-warning"><ShieldAlert size={17} /><p>هذه صفحة تجريبية فقط؛ بيانات الدخول مخزّنة في واجهة الموقع وليست حماية فعلية لموقع منشور.</p></div>
        </section>
        <aside className="login-art"><div className="login-art__content"><span className="eyebrow"><span className="eyebrow-line" /> خلف الكواليس</span><h2>اصنع مكتبتك،<br /><em>بطريقتك.</em></h2><p>أضف أعمالك، عدّل بياناتها، وامنح كل حكاية مكانًا في مجموعتك.</p><span className="login-art__bottom">CINEMA AL ARAB  ·  DEMO STUDIO</span></div></aside>
      </div>
    </main>
  );
}
