import React, { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowRight, Clapperboard } from 'lucide-react';
import { MoviesProvider } from './context/MoviesContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminRoute from './components/AdminRoute';
import Home from './pages/Home';
import WatchPage from './pages/WatchPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

function NotFound() {
  return <main className="container-wide page-missing"><Clapperboard size={45} /><h1>هذه الصفحة ليست هنا</h1><p>لكن هناك الكثير من الحكايات بانتظارك في المكتبة.</p><Link to="/" className="button button--gold">العودة للرئيسية <ArrowRight size={17} /></Link></main>;
}

function AppRoutes() {
  return <div className="app-shell"><ScrollToTop /><Navbar /><Routes><Route path="/" element={<Home />} /><Route path="/watch/:id" element={<WatchPage />} /><Route path="/admin/login" element={<AdminLogin />} /><Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} /><Route path="*" element={<NotFound />} /></Routes><Footer /></div>;
}

export default function App() {
  return <MoviesProvider><BrowserRouter><AppRoutes /></BrowserRouter></MoviesProvider>;
}
