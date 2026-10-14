import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import PageShell from './components/layout/PageShell';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
import { RequireAuth, RequireAdmin, RequireVerified } from './routes/Guards';
import { DraftProvider } from './context/DraftContext';
import RouteEffects from './components/layout/RouteEffects';

const SignUp = lazy(() => import('./pages/SignUp'));

const Login = lazy(() => import('./pages/Login'));

const VerificationPending = lazy(() => import('./pages/VerificationPending'));

const AdminQueue = lazy(() => import('./pages/AdminQueue'));

const Browse = lazy(() => import('./pages/Browse'));
const ItemDetail = lazy(() => import('./pages/ItemDetail'));
const PostItem = lazy(() => import('./pages/PostItem'));
const MyListings = lazy(() => import('./pages/MyListings'));
const RequestDetail = lazy(() => import('./pages/RequestDetail'));
const ItemRequests = lazy(() => import('./pages/ItemRequests'));
const Profile = lazy(() => import('./pages/Profile'));

const UiPreview = import.meta.env.DEV ? lazy(() => import('./pages/UiPreview')) : null;

export default function App() {
  const location = useLocation();
  const callback = new URLSearchParams(location.hash.slice(1));
  const query = new URLSearchParams(location.search);
  if (
    callback.has('error') ||
    callback.has('error_code') ||
    query.has('error_code') ||
    query.has('error')
  )
    return <Navigate to="/login?confirmation=expired" replace />;
  return (
    <DraftProvider>
      <RouteEffects />
      <PageShell>
        <Suspense
          fallback={
            <p className="container page-section" role="status">
              Loading page…
            </p>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/shelf" element={<Browse />} />
            <Route path="/items/:id" element={<ItemDetail />} />
            <Route element={<RequireAuth />}>
              <Route path="/pending" element={<VerificationPending />} />
              <Route element={<RequireVerified />}>
                <Route path="/items/new" element={<PostItem key="new" />} />
                <Route path="/items/:id/edit" element={<PostItem />} />
                <Route path="/items/:id/requests" element={<ItemRequests />} />
                <Route path="/activity" element={<MyListings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/users/:id" element={<Profile />} />
                <Route path="/requests/:id" element={<RequestDetail />} />
              </Route>
              <Route element={<RequireAdmin />}>
                <Route path="/admin/verification" element={<AdminQueue />} />
              </Route>
            </Route>
            {import.meta.env.DEV && (
              <Route
                path="/__ui"
                element={
                  <Suspense fallback={<p role="status">Loading preview…</p>}>
                    <UiPreview />
                  </Suspense>
                }
              />
            )}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </PageShell>
    </DraftProvider>
  );
}
