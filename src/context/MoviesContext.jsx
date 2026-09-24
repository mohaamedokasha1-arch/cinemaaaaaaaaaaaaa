import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../utils/storage';
import apiClient from '../utils/api';

const MoviesContext = createContext(null);

export function useMovies() {
  const context = useContext(MoviesContext);
  if (!context) throw new Error('useMovies must be used inside MoviesProvider');
  return context;
}

export function MoviesProvider({ children }) {
  const [movies, setMovies] = useState(() => {
    storage.initializeSampleData();
    return storage.getMovies();
  });
  const [favorites, setFavorites] = useState(() => storage.getFavorites());
  const [isAdmin, setIsAdmin] = useState(() => storage.isAuthenticated());
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Initial fetch from backend
  useEffect(() => {
    const init = async () => {
      try {
        const backendMovies = await apiClient.getMovies();
        if (backendMovies && backendMovies.length > 0) {
          setMovies(backendMovies);
          setBackendStatus('connected');
        } else {
          setBackendStatus('local');
        }
      } catch {
        setBackendStatus('local');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Keep multiple tabs of the same browser in sync.
  useEffect(() => {
    const sync = () => {
      setFavorites(storage.getFavorites());
      setIsAdmin(storage.isAuthenticated());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const refreshMovies = async () => {
    try {
      const backendMovies = await apiClient.getMovies();
      if (backendMovies && backendMovies.length > 0) {
        setMovies(backendMovies);
        setBackendStatus('connected');
        return;
      }
    } catch {}
    setMovies(storage.getMovies());
  };

  const addMovie = async (movie) => {
    try {
      const result = await apiClient.addMovie(movie);
      if (result.success) {
        await refreshMovies();
        return result;
      }
    } catch {}
    const result = storage.addMovie(movie);
    if (result.success) setMovies(storage.getMovies());
    return result;
  };

  const updateMovie = async (id, changes) => {
    try {
      const success = await apiClient.updateMovie(id, changes);
      if (success) {
        await refreshMovies();
        return true;
      }
    } catch {}
    const success = storage.updateMovie(id, changes);
    if (success) setMovies(storage.getMovies());
    return success;
  };

  const deleteMovie = async (id) => {
    try {
      const success = await apiClient.deleteMovie(id);
      if (success) {
        await refreshMovies();
        setFavorites(storage.getFavorites());
        return true;
      }
    } catch {}
    const success = storage.deleteMovie(id);
    if (success) {
      setMovies(storage.getMovies());
      setFavorites(storage.getFavorites());
    }
    return success;
  };

  const toggleFavorite = (id) => {
    const result = storage.toggleFavorite(id);
    if (result.success) setFavorites(result.favorites);
    return result.success;
  };

  const login = (username, password) => {
    const result = storage.login(username, password);
    if (result.success) setIsAdmin(true);
    return result;
  };

  const logout = () => {
    storage.logout();
    setIsAdmin(false);
  };

  return (
    <MoviesContext.Provider value={{
      movies, favorites, isAdmin, addMovie, updateMovie, deleteMovie,
      toggleFavorite, login, logout,
      refreshMovies,
      loading,
      backendStatus,
      apiClient
    }}>
      {children}
    </MoviesContext.Provider>
  );
}
