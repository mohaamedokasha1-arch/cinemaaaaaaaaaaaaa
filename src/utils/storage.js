import { sampleMovies } from '../data/sampleMovies';

const MOVIES_KEY = 'cinema_al_arab_movies_v1';
const FAVORITES_KEY = 'cinema_al_arab_favorites_v1';
const ADMIN_KEY = 'cinema_al_arab_admin_demo_v1';
const LEGACY_KEY = 'movies_db';

// DEMO ONLY: this is not authentication. A production app needs a backend.
const DEMO_ADMIN = { username: 'admin', password: 'admin123' };

function readJson(key) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? null : JSON.parse(value);
  } catch { return null; }
}

function saveJson(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('تعذّر حفظ البيانات في هذا المتصفح:', error);
    return false;
  }
}

export const storage = {
  initializeSampleData() {
    try {
      if (localStorage.getItem(MOVIES_KEY) !== null) return;
      const legacy = readJson(LEGACY_KEY);
      saveJson(MOVIES_KEY, Array.isArray(legacy) ? legacy : sampleMovies);
    } catch (error) {
      console.error('تعذّر تهيئة البيانات:', error);
    }
  },

  getMovies() {
    const movies = readJson(MOVIES_KEY);
    return Array.isArray(movies) ? movies : sampleMovies;
  },

  getMovieById(id) {
    return storage.getMovies().find((movie) => movie.id === id);
  },

  addMovie(movie) {
    const newMovie = {
      ...movie,
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    const success = saveJson(MOVIES_KEY, [newMovie, ...storage.getMovies()]);
    return { success, movie: success ? newMovie : null };
  },

  updateMovie(id, changes) {
    const movies = storage.getMovies();
    if (!movies.some((movie) => movie.id === id)) return false;
    return saveJson(MOVIES_KEY, movies.map((movie) => movie.id === id ? { ...movie, ...changes } : movie));
  },

  deleteMovie(id) {
    const movies = storage.getMovies();
    if (!movies.some((movie) => movie.id === id)) return false;
    const success = saveJson(MOVIES_KEY, movies.filter((movie) => movie.id !== id));
    if (success) saveJson(FAVORITES_KEY, storage.getFavorites().filter((favoriteId) => favoriteId !== id));
    return success;
  },

  getFavorites() {
    const favorites = readJson(FAVORITES_KEY);
    return Array.isArray(favorites) ? favorites.filter((id) => typeof id === 'string') : [];
  },

  toggleFavorite(id) {
    const current = storage.getFavorites();
    const favorites = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    return { success: saveJson(FAVORITES_KEY, favorites), favorites };
  },

  login(username, password) {
    if (username.trim() !== DEMO_ADMIN.username || password !== DEMO_ADMIN.password) {
      return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }
    try {
      localStorage.setItem(ADMIN_KEY, 'demo');
      return { success: true };
    } catch {
      return { success: false, message: 'الرجاء تفعيل التخزين المحلي في المتصفح.' };
    }
  },

  logout() {
    try { localStorage.removeItem(ADMIN_KEY); } catch { /* storage disabled */ }
  },

  isAuthenticated() {
    try { return localStorage.getItem(ADMIN_KEY) === 'demo'; } catch { return false; }
  },
};
