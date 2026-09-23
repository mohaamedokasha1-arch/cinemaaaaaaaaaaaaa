import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMovies } from '../context/MoviesContext';

// A convenience route guard for the local demo, not a security boundary.
export default function AdminRoute({ children }) {
  const { isAdmin } = useMovies();
  const location = useLocation();
  return isAdmin ? children : <Navigate to="/admin/login" state={{ from: location }} replace />;
}
