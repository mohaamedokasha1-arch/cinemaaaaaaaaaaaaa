import React, { useEffect, useState } from 'react';
import { Activity, Server, Film, CheckCircle, AlertTriangle, Clock, Zap, Database, TrendingUp, Mic, Subtitles, Play, RefreshCw, Download, Trash2, BarChart3 } from 'lucide-react';
import apiClient from '../utils/api';

export default function AutomationDashboard() {
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = async () => {
    try {
      const [statusData, statsData, logsData] = await Promise.all([
        apiClient.getAutomationStatus().catch(() => null),
        apiClient.getAutomationStats().catch(() => null),
        apiClient.getLogs(20).catch(() => [])
      ]);

      setStatus(statusData);
      setStats(statsData);
      setLogs(logsData);
    } catch (e) {
      console.error('Failed to fetch automation data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const triggerAction = async (action, params = {}) => {
    setActionLoading(action);
    try {
      let result;
      switch (action) {
        case 'sync':
          result = await apiClient.triggerSync(params.limit || 15);
          break;
        case 'validate':
          result = await apiClient.request('/automation/validate', { method: 'POST' });
          break;
        case 'trending':
          result = await apiClient.request('/automation/trending', { method: 'POST' });
          break;
        case 'arabic-dub':
          result = await apiClient.request('/automation/arabic-dub', { method: 'POST' });
          break;
        default:
          throw new Error('Unknown action');
      }
      console.log(`${action} triggered:`, result);
      setTimeout(fetchData, 2000);
    } catch (e) {
      alert(`فشل تنفيذ ${action}: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="automation-dashboard loading">
        <div className="spinner" />
        <span>جاري تحميل بيانات الأتمتة...</span>
      </div>
    );
  }

  if (!status && !stats) {
    return (
      <div className="automation-dashboard offline">
        <AlertTriangle size={32} />
        <h3>نظام الأتمتة غير متصل</h3>
        <p>الخادم الخلفي غير متاح. يعمل النظام في وضع localStorage فقط.</p>
        <div className="offline-info">
          <p>لتفعيل الأتمتة الكاملة:</p>
          <code>npm run build && npm start</code>
          <p>أو اضبط TMDB_API_KEY في ملف .env</p>
        </div>
      </div>
    );
  }

  const dbStats = stats?.database || status?.db_stats || {};
  const schedulerStatus = stats?.scheduler || status?.scheduler || {};

  return (
    <div className="automation-dashboard">
      {/* Header */}
      <div className="automation-header">
        <div>
          <span className="section-kicker">🤖 نظام التشغيل الآلي الكامل</span>
          <h2>مركز التحكم الذكي</h2>
          <p>مراقبة وإدارة جميع وحدات الأتمتة الخمس</p>
        </div>
        <div className="automation-actions">
          <button
            type="button"
            className="button button--gold"
            onClick={() => triggerAction('sync', { limit: 20 })}
            disabled={actionLoading === 'sync'}
          >
            {actionLoading === 'sync' ? <RefreshCw size={16} className="spin" /> : <Zap size={16} />}
            مزامنة كاملة الآن
          </button>
          <button type="button" className="button button--outline" onClick={fetchData}>
            <RefreshCw size={16} /> تحديث
          </button>
        </div>
      </div>

      {/* System Health */}
      <div className="health-grid">
        <div className="health-card health-card--ok">
          <Activity size={20} />
          <div>
            <strong>حالة النظام</strong>
            <span>{status?.is_running ? 'يعمل بشكل طبيعي' : 'متوقف'} • Uptime: {Math.floor((dbStats.uptime || 0) / 3600)} ساعة</span>
          </div>
          <CheckCircle size={18} className="health-icon" />
        </div>
        <div className="health-card">
          <Database size={20} />
          <div>
            <strong>قاعدة البيانات</strong>
            <span>{dbStats.total_movies || 0} فيلم • {dbStats.total_servers || 0} سيرفر</span>
          </div>
        </div>
        <div className="health-card">
          <Server size={20} />
          <div>
            <strong>المجدول الذكي</strong>
            <span>{schedulerStatus.queue_stats?.pending || 0} في الانتظار • {schedulerStatus.queue_stats?.running || 0} قيد التشغيل</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-card__icon"><Film size={24} /></span>
          <span>إجمالي الأفلام</span>
          <strong>{dbStats.total_movies || 0}</strong>
          <small>{dbStats.new_count || 0} جديد • {dbStats.trending_count || 0} رائج</small>
        </div>
        <div className="stat-card">
          <span className="stat-card__icon stat-card__icon--blue"><Server size={24} /></span>
          <span>السيرفرات النشطة</span>
          <strong>{dbStats.active_servers || 0}</strong>
          <small>{dbStats.total_servers || 0} إجمالي • {dbStats.inactive_servers || 0} معطل</small>
        </div>
        <div className="stat-card">
          <span className="stat-card__icon stat-card__icon--rose"><Mic size={24} /></span>
          <span>مدبلج عربي</span>
          <strong>{dbStats.arabic_dub_count || 0}</strong>
          <small>{dbStats.arabic_subs_count || 0} مترجم • أولوية عالية</small>
        </div>
        <div className="stat-card">
          <span className="stat-card__icon"><TrendingUp size={24} /></span>
          <span>المشاهدات</span>
          <strong>{(dbStats.total_views || 0).toLocaleString()}</strong>
          <small>إجمالي المشاهدات</small>
        </div>
      </div>

      {/* Modules Status */}
      <div className="modules-grid">
        <h3>وحدات الأتمتة (5 وحدات)</h3>
        <div className="modules-list">
          {[
            { name: 'ArabicMovieDataAggregator', desc: 'جمع البيانات من TMDB', icon: Film, status: 'ready', color: '#dfbc7c' },
            { name: 'EmbedLinksFetcherPro', desc: 'جلب روابط التشغيل (10 مصادر)', icon: Server, status: 'ready', color: '#9abed1' },
            { name: 'IntelligentSyncScheduler', desc: '6 وظائف مجدولة', icon: Clock, status: 'running', color: '#a8d5a8' },
            { name: 'AIContentValidator', desc: 'كشف التكرار والجودة', icon: BarChart3, status: 'ready', color: '#e7b69e' },
            { name: 'AutoPublishingSystem', desc: 'النشر التلقائي + SEO', icon: Zap, status: 'ready', color: '#d4b8e0' }
          ].map((mod) => (
            <div key={mod.name} className="module-card">
              <div className="module-card__icon" style={{ background: `${mod.color}22`, color: mod.color }}>
                <mod.icon size={20} />
              </div>
              <div className="module-card__info">
                <strong>{mod.name}</strong>
                <span>{mod.desc}</span>
              </div>
              <span className={`module-status module-status--${mod.status}`}>{mod.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cron Jobs */}
      {schedulerStatus.cron_jobs && (
        <div className="cron-section">
          <h3>الوظائف المجدولة (6 وظائف)</h3>
          <div className="cron-grid">
            {schedulerStatus.cron_jobs.map((job) => (
              <div key={job.name} className="cron-card">
                <strong>{job.name}</strong>
                <code>{job.cron}</code>
                <small>كل {Math.round(job.interval_ms / 3600000)} ساعة</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>إجراءات سريعة</h3>
        <div className="actions-grid">
          <button type="button" className="action-card" onClick={() => triggerAction('sync', { limit: 10 })} disabled={!!actionLoading}>
            <Download size={20} />
            <span>جلب أفلام جديدة</span>
            <small>TMDB + Arabic sites</small>
          </button>
          <button type="button" className="action-card" onClick={() => triggerAction('validate')} disabled={!!actionLoading}>
            <CheckCircle size={20} />
            <span>فحص السيرفرات</span>
            <small>تحقق من {dbStats.total_servers || 0} سيرفر</small>
          </button>
          <button type="button" className="action-card" onClick={() => triggerAction('trending')} disabled={!!actionLoading}>
            <TrendingUp size={20} />
            <span>تحديث الرائج</span>
            <small>من TMDB Trending</small>
          </button>
          <button type="button" className="action-card" onClick={() => triggerAction('arabic-dub')} disabled={!!actionLoading}>
            <Mic size={20} />
            <span>فحص الدبلجة</span>
            <small>Akwam + FaselHD</small>
          </button>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="logs-section">
        <div className="logs-header">
          <h3>سجلات المزامنة الأخيرة</h3>
          <span>{logs.length} سجل</span>
        </div>
        
        {logs.length > 0 ? (
          <div className="logs-list">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className={`log-card log-card--${log.status}`}>
                <div className="log-card__header">
                  <strong>{log.module_name}</strong>
                  <span className={`log-status log-status--${log.status}`}>{log.status}</span>
                </div>
                <div className="log-card__meta">
                  <span>{log.job_type}</span>
                  <span>{new Date(log.start_time).toLocaleString('ar-EG')}</span>
                  <span>{log.execution_time_ms ? `${log.execution_time_ms}ms` : ''}</span>
                </div>
                {(log.movies_added > 0 || log.servers_added > 0) && (
                  <div className="log-card__stats">
                    {log.movies_added > 0 && <span>🎬 {log.movies_added} فيلم جديد</span>}
                    {log.servers_added > 0 && <span>🔗 {log.servers_added} سيرفر</span>}
                    {log.movies_processed > 0 && <span>📊 {log.movies_processed} معالجة</span>}
                  </div>
                )}
                {log.errors?.length > 0 && (
                  <div className="log-card__errors">
                    {log.errors.slice(0, 2).map((e, i) => (
                      <small key={i}>⚠️ {e.error_message || e.error || JSON.stringify(e).slice(0, 100)}</small>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-logs">
            <Clock size={24} />
            <span>لا توجد سجلات بعد - ابدأ مزامنة الآن</span>
          </div>
        )}
      </div>

      {/* Top Movies */}
      {dbStats.top_movies && (
        <div className="top-movies-section">
          <h3>الأفلام الأكثر مشاهدة</h3>
          <div className="top-movies-list">
            {dbStats.top_movies.map((m, idx) => (
              <div key={m.id} className="top-movie">
                <span className="top-movie__rank">#{idx + 1}</span>
                <span className="top-movie__title">{m.title}</span>
                <span className="top-movie__views">{m.views} مشاهدة</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
