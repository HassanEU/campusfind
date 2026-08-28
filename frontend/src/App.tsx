import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';

import Landing from '@/pages/Landing';
import SignIn from '@/pages/SignIn';
import SignUp from '@/pages/SignUp';

/* Route-level code splitting: the landing page and auth screens load on their
   own, and each role's area only downloads when someone actually goes there. */
const StudentDashboard = lazy(() => import('@/pages/student/Dashboard'));
const MyReports = lazy(() => import('@/pages/student/MyReports'));
const ReportDetail = lazy(() => import('@/pages/student/ReportDetail'));
const ReportLost = lazy(() => import('@/pages/student/ReportLost'));
const ReportFound = lazy(() => import('@/pages/student/ReportFound'));
const Matches = lazy(() => import('@/pages/student/Matches'));
const MatchDetail = lazy(() => import('@/pages/student/MatchDetail'));
const MyClaims = lazy(() => import('@/pages/student/MyClaims'));
const Browse = lazy(() => import('@/pages/student/Browse'));
const Profile = lazy(() => import('@/pages/student/Profile'));

const StaffDashboard = lazy(() => import('@/pages/staff/Dashboard'));
const Verify = lazy(() => import('@/pages/staff/Verify'));
const ClaimQueue = lazy(() => import('@/pages/staff/ClaimQueue'));
const Storage = lazy(() => import('@/pages/staff/Storage'));

const AdminAnalytics = lazy(() => import('@/pages/admin/Analytics'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminCategories = lazy(() => import('@/pages/admin/Categories'));
const AdminLocations = lazy(() => import('@/pages/admin/Locations'));
const AuditLog = lazy(() => import('@/pages/admin/AuditLog'));

function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

function RouteSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

/**
 * Guards a route. An unauthenticated visitor is sent to sign in and remembers
 * where they were going; a signed-in user with the wrong role is sent to their
 * own home rather than shown a dead end.
 */
function Protected({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullPageSpinner />;
  if (!user) {
    return <Navigate to="/signin" state={{ from: location.pathname + location.search }} replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;

  return <AppShell>{children}</AppShell>;
}

function homeFor(role: Role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'STAFF') return '/staff';
  return '/app';
}

/** Sends a signed-in user straight to the right home page. */
function RoleHome() {
  const { user, initializing } = useAuth();
  if (initializing) return <FullPageSpinner />;
  if (!user) return <Navigate to="/signin" replace />;
  return <Navigate to={homeFor(user.role)} replace />;
}

export default function App() {
  const { user, initializing } = useAuth();

  return (
    <Suspense fallback={<RouteSpinner />}>
      <Routes>
        {/* public */}
        <Route
          path="/"
          element={
            initializing ? <FullPageSpinner /> : user ? <Navigate to={homeFor(user.role)} replace /> : <Landing />
          }
        />
        <Route path="/signin" element={user ? <RoleHome /> : <SignIn />} />
        <Route path="/signup" element={user ? <RoleHome /> : <SignUp />} />

        {/* student */}
        <Route path="/app" element={<Protected roles={['STUDENT']}><StudentDashboard /></Protected>} />
        <Route path="/app/reports" element={<Protected roles={['STUDENT']}><MyReports /></Protected>} />
        <Route path="/app/reports/:id" element={<Protected roles={['STUDENT']}><ReportDetail /></Protected>} />
        <Route path="/app/report/lost" element={<Protected roles={['STUDENT']}><ReportLost /></Protected>} />
        <Route path="/app/report/found" element={<Protected><ReportFound /></Protected>} />
        <Route path="/app/matches" element={<Protected roles={['STUDENT']}><Matches /></Protected>} />
        <Route path="/app/matches/:id" element={<Protected roles={['STUDENT']}><MatchDetail /></Protected>} />
        <Route path="/app/claims" element={<Protected roles={['STUDENT']}><MyClaims /></Protected>} />
        <Route path="/app/browse" element={<Protected><Browse /></Protected>} />
        <Route path="/app/profile" element={<Protected><Profile /></Protected>} />

        {/* staff */}
        <Route path="/staff" element={<Protected roles={['STAFF', 'ADMIN']}><StaffDashboard /></Protected>} />
        <Route path="/staff/verify" element={<Protected roles={['STAFF', 'ADMIN']}><Verify /></Protected>} />
        <Route path="/staff/claims" element={<Protected roles={['STAFF', 'ADMIN']}><ClaimQueue /></Protected>} />
        <Route path="/staff/storage" element={<Protected roles={['STAFF', 'ADMIN']}><Storage /></Protected>} />

        {/* admin */}
        <Route path="/admin" element={<Protected roles={['ADMIN']}><AdminAnalytics /></Protected>} />
        <Route path="/admin/users" element={<Protected roles={['ADMIN']}><AdminUsers /></Protected>} />
        <Route path="/admin/categories" element={<Protected roles={['ADMIN']}><AdminCategories /></Protected>} />
        <Route path="/admin/locations" element={<Protected roles={['ADMIN']}><AdminLocations /></Protected>} />
        <Route path="/admin/audit" element={<Protected roles={['STAFF', 'ADMIN']}><AuditLog /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
