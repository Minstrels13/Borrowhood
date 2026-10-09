import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
export function RequireAuth() {
  const { loading, user, error, refresh } = useAuth();
  if (loading) return <p className="container page-section" role="status">Loading your account…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (error) return <div className="container page-section"><h1>Unable to load your account</h1><p role="alert">{error}</p><Button onClick={refresh}>Try again</Button></div>;
  return <Outlet />;
}
export function RequireVerified() {
  return useAuth().isVerified ? <Outlet /> : <Navigate to="/pending" replace />;
}
export function RequireAdmin() {
  return useAuth().isAdmin ? <Outlet /> : <div className="container page-section"><h1>Admin access required</h1><p>This page is available only to an administrator.</p><Button to="/shelf">Back to shelf</Button></div>;
}
