/**
 * 🌐 API Client - يتصل بالـ Backend الجديد مع fallback لـ localStorage
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.base = API_BASE;
    this.isBackendAvailable = null;
  }

  async checkBackend() {
    if (this.isBackendAvailable !== null) return this.isBackendAvailable;
    try {
      const res = await fetch(`${this.base}/health`, { method: 'GET' });
      this.isBackendAvailable = res.ok;
      return this.isBackendAvailable;
    } catch {
      this.isBackendAvailable = false;
      return false;
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.base}${endpoint}`;
    try {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      return data;
    } catch (e) {
      // If backend unavailable, throw to trigger fallback
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        this.isBackendAvailable = false;
      }
      throw e;
    }
  }

  // Movies
  async getMovies(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) params.set(k, v);
    });

    try {
      if (await this.checkBackend()) {
        const data = await this.request(`/movies?${params.toString()}`);
        return data.data || [];
      }
    } catch (e) {
      console.warn('Backend unavailable, using localStorage fallback:', e.message);
    }
    
    // Fallback to localStorage
    const { storage } = await import('./storage.js');
    storage.initializeSampleData();
    let movies = storage.getMovies();
    
    // Apply filters locally
    if (filters.search) {
      const q = filters.search.toLowerCase();
      movies = movies.filter(m => 
        `${m.title} ${m.titleAr} ${m.category} ${m.description}`.toLowerCase().includes(q)
      );
    }
    if (filters.category && filters.category !== 'الكل') {
      movies = movies.filter(m => m.category === filters.category);
    }
    return movies;
  }

  async getMovieById(id) {
    try {
      if (await this.checkBackend()) {
        const data = await this.request(`/movies/${encodeURIComponent(id)}`);
        return data.data;
      }
    } catch (e) {
      console.warn('Backend fallback for movie:', id);
    }

    const { storage } = await import('./storage.js');
    return storage.getMovieById(id);
  }

  async getMovieServers(id) {
    try {
      if (await this.checkBackend()) {
        const data = await this.request(`/movies/${encodeURIComponent(id)}/servers`);
        return data.data || [];
      }
    } catch {
      // Fallback: generate mock servers
    }

    // Mock servers for fallback
    return [
      {
        id: 'mock_1',
        server_name: 'VidSrc',
        embed_url: `https://vidsrc.to/embed/movie/${id}`,
        quality: '1080p',
        has_arabic_subs: true,
        priority: 1,
        is_active: true
      },
      {
        id: 'mock_2',
        server_name: '2Embed',
        embed_url: `https://www.2embed.to/embed/tmdb/movie?id=${id}`,
        quality: 'HD',
        has_arabic_subs: true,
        priority: 2,
        is_active: true
      }
    ];
  }

  async addMovie(movie) {
    try {
      if (await this.checkBackend()) {
        const data = await this.request('/movies', {
          method: 'POST',
          body: JSON.stringify(movie)
        });
        return { success: true, movie: data.data };
      }
    } catch (e) {
      console.warn('Backend add failed, fallback:', e.message);
    }

    const { storage } = await import('./storage.js');
    return storage.addMovie(movie);
  }

  async updateMovie(id, changes) {
    try {
      if (await this.checkBackend()) {
        const data = await this.request(`/movies/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify(changes)
        });
        return data.data ? true : false;
      }
    } catch {}
    
    const { storage } = await import('./storage.js');
    return storage.updateMovie(id, changes);
  }

  async deleteMovie(id) {
    try {
      if (await this.checkBackend()) {
        await this.request(`/movies/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
        return true;
      }
    } catch {}
    
    const { storage } = await import('./storage.js');
    return storage.deleteMovie(id);
  }

  async incrementView(id) {
    try {
      if (await this.checkBackend()) {
        await this.request(`/movies/${encodeURIComponent(id)}/view`, {
          method: 'POST'
        });
      }
    } catch {}
  }

  // Automation
  async getAutomationStatus() {
    try {
      const data = await this.request('/automation/status');
      return data.data;
    } catch {
      return null;
    }
  }

  async getAutomationStats() {
    try {
      const data = await this.request('/automation/stats');
      return data.data;
    } catch {
      return null;
    }
  }

  async getLogs(limit = 50) {
    try {
      const data = await this.request(`/automation/logs?limit=${limit}`);
      return data.data || [];
    } catch {
      return [];
    }
  }

  async triggerSync(limit = 15) {
    try {
      const data = await this.request('/automation/sync', {
        method: 'POST',
        body: JSON.stringify({ limit, type: 'full' })
      });
      return data;
    } catch (e) {
      throw e;
    }
  }

  async fetchEmbeds(movieId) {
    try {
      const data = await this.request(`/automation/fetch-embed/${encodeURIComponent(movieId)}`, {
        method: 'POST'
      });
      return data;
    } catch (e) {
      throw e;
    }
  }

  async getHealth() {
    try {
      const data = await this.request('/health');
      return data;
    } catch {
      return { status: 'offline' };
    }
  }
}

const apiClient = new ApiClient();
export default apiClient;
