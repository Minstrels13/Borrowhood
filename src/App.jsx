import { lazy, Suspense, useEffect } from 'react';
import { brand } from './config/brand';
import { Routes, Route } from 'react-router-dom';
import PageShell from './components/layout/PageShell';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
const SignUp = lazy(() => import('./pages/SignUp'));
const Login = lazy(() => import('./pages/Login'));
const VerificationPending = lazy(() => import('./pages/VerificationPending'));
const AdminQueue = lazy(() => import('./pages/AdminQueue'));
const ShelfBoundary = lazy(() => import('./pages/ShelfBoundary'));
import { RequireAuth, RequireAdmin } from './routes/Guards';
const UiPreview = import.meta.env.DEV ? lazy(() => import('./pages/UiPreview')) : null;
export default function App() {
  useEffect(() => { document.title = brand.name; }, []);
  return <PageShell><Suspense fallback={<p className="container page-section" role="status">Loading page…</p>}><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/signup" element={<SignUp />} />
    <Route path="/login" element={<Login />} />
    <Route path="/shelf" element={<ShelfBoundary />} />
    <Route element={<RequireAuth />}>
      <Route path="/pending" element={<VerificationPending />} />
      <Route element={<RequireAdmin />}><Route path="/admin/verification" element={<AdminQueue />} /></Route>
    </Route>
    {import.meta.env.DEV && <Route path="/__ui" element={<Suspense fallback={<p role="status">Loading preview…</p>}><UiPreview /></Suspense>} />}
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense></PageShell>;
}

