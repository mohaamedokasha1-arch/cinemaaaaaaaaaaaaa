import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../utils/storage';

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

  // Keep multiple tabs of the same browser in sync.
  useEffect(() => {
    const sync = () => {
      setMovies(storage.getMovies());
      setFavorites(storage.getFavorites());
      setIsAdmin(storage.isAuthenticated());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const addMovie = (movie) => {
    const result = storage.addMovie(movie);
    if (result.success) setMovies(storage.getMovies());
    return result;
  };

  const updateMovie = (id, changes) => {
    const success = storage.updateMovie(id, changes);
    if (success) setMovies(storage.getMovies());
    return success;
  };

  const deleteMovie = (id) => {
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
      refreshMovies: () => setMovies(storage.getMovies()),
    }}>
      {children}
    </MoviesContext.Provider>
  );
}
