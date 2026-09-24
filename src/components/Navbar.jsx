import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Clapperboard, Heart, LayoutDashboard, LockKeyhole, LogOut, Menu, X } from 'lucide-react';
import { useMovies } from '../context/MoviesContext';

const links = [
  { label: 'الرئيسية', to: '/', key: 'all' },
  { label: 'الأفلام', to: '/?type=movie', key: 'movie' },
  { label: 'المسلسلات', to: '/?type=series', key: 'series' },
  { label: 'مدبلج 🎙️', to: '/?type=dubbed', key: 'dubbed' },
  { label: 'الرائج 🔥', to: '/?type=trending', key: 'trending' },
  { label: 'قائمتي', to: '/?type=favorites', key: 'favorites', icon: Heart },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, logout, favorites } = useMovies();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeType = location.pathname === '/' ? new URLSearchParams(location.search).get('type') || 'all' : null;

  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const navLinks = links.map(({ label, to, key, icon: Icon }) => (
    <Link
      key={key}
      to={to}
      onClick={() => setMenuOpen(false)}
      className={`nav-link ${activeType === key ? 'nav-link--active' : ''}`}
      aria-current={activeType === key ? 'page' : undefined}
    >
      {Icon && <Icon size={16} strokeWidth={1.9} aria-hidden="true" />}
      <span>{label}</span>
      {key === 'favorites' && favorites.length > 0 && <span className="nav-count">{favorites.length}</span>}
    </Link>
  ));

  return (
    <header className="site-header">
      <div className="container-wide header-inner">
        <Link to="/" className="brand" aria-label="سينما العرب - الرئيسية" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><Clapperboard size={23} strokeWidth={2} aria-hidden="true" /></span>
          <span className="brand-copy"><strong>سينما <span>العرب</span></strong><small>CINEMA AL ARAB</small></span>
        </Link>

        <nav className="nav-desktop" aria-label="التنقل الرئيسي">{navLinks}</nav>

        <div className="header-actions">
          {isAdmin ? (
            <>
              <Link className="header-admin" to="/admin"><LayoutDashboard size={17} /> لوحة التحكم</Link>
              <button className="header-icon-button" type="button" onClick={handleLogout} aria-label="تسجيل الخروج" title="تسجيل الخروج"><LogOut size={19} /></button>
            </>
          ) : (
            <Link className="header-admin" to="/admin/login"><LockKeyhole size={16} /> دخول الإدارة</Link>
          )}
          <button
            type="button"
            className="header-icon-button mobile-menu-toggle"
            aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
        </div>
      </div>
      {menuOpen && (
        <nav id="mobile-navigation" className="mobile-navigation" aria-label="التنقل على الهاتف">
          <div className="mobile-navigation__links">{navLinks}</div>
          {isAdmin ? (
            <div className="mobile-navigation__actions">
              <Link to="/admin" onClick={() => setMenuOpen(false)}><LayoutDashboard size={18} /> لوحة التحكم</Link>
              <button type="button" onClick={handleLogout}><LogOut size={18} /> تسجيل الخروج</button>
            </div>
          ) : (
            <div className="mobile-navigation__actions"><Link to="/admin/login" onClick={() => setMenuOpen(false)}><LockKeyhole size={18} /> دخول الإدارة</Link></div>
          )}
        </nav>
      )}
    </header>
  );
}
