import React from 'react';
import { Link } from 'react-router-dom';
import { Clapperboard, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container-wide footer-main">
        <div className="footer-about">
          <Link to="/" className="brand brand--footer"><span className="brand-mark"><Clapperboard size={21} /></span><span className="brand-copy"><strong>سينما <span>العرب</span></strong><small>CINEMA AL ARAB</small></span></Link>
          <p>مساحة صغيرة للحكايات الكبيرة. اكتشف أعمالاً مختارة واحتفظ بما تحب في قائمتك.</p>
        </div>
        <div className="footer-links"><span>اكتشف</span><Link to="/">كل الأعمال</Link><Link to="/?type=movie">الأفلام</Link><Link to="/?type=series">المسلسلات</Link></div>
        <div className="footer-links"><span>حسابك</span><Link to="/?type=favorites"><Heart size={15} /> قائمتي</Link><Link to="/admin/login">لوحة الإدارة التجريبية</Link></div>
      </div>
      <div className="container-wide footer-bottom"><span>© {new Date().getFullYear()} سينما العرب. مشروع عرض توضيحي.</span><span>المقاطع المعروضة دعائية، وحقوق الأعمال لأصحابها.</span></div>
    </footer>
  );
}
