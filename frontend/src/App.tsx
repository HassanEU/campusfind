import type { Role } from '@/types';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Suspense, lazy, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { homeFor, roleAllowed } from '@/lib/roles';

import Landing from '@/pages/Landing';
import SignIn from '@/pages/SignIn';
import SignUp from '@/pages/SignUp';
import StaffSignIn from '@/pages/StaffSignIn';
import ForgotPassword from '@/pages/ForgotPassword';
import DeskSetup from '@/pages/DeskSetup';

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
const StaffInsights = lazy(() => import('@/pages/admin/Analytics'));
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

function Protected({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullPageSpinner />;
  if (!user) {
    const from = location.pathname + location.search;
    const staffArea =
      location.pathname === '/staff' ||
      (location.pathname.startsWith('/staff/') &&
        !location.pathname.startsWith('/staff/signin') &&
        !location.pathname.startsWith('/staff/forgot-password'));
    return <Navigate to={staffArea ? '/staff/signin' : '/signin'} state={{ from }} replace />;
  }
  if (roles && !roleAllowed(user.role, roles)) return <Navigate to={homeFor(user.role)} replace />;

  return <AppShell>{children}</AppShell>;
}

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
        <Route
          path="/"
          element={
            initializing ? <FullPageSpinner /> : user ? <Navigate to={homeFor(user.role)} replace /> : <Landing />
          }
        />
        <Route path="/signin" element={user ? <RoleHome /> : <SignIn />} />
        <Route path="/signup" element={user ? <RoleHome /> : <SignUp />} />
        <Route
          path="/forgot-password"
          element={user ? <RoleHome /> : <ForgotPassword portal="student" />}
        />
        <Route path="/staff/signin" element={user ? <RoleHome /> : <StaffSignIn />} />
        <Route
          path="/staff/forgot-password"
          element={user ? <RoleHome /> : <ForgotPassword portal="staff" />}
        />
        <Route path="/desk-setup" element={user ? <RoleHome /> : <DeskSetup />} />

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

        <Route path="/staff" element={<Protected roles={['STAFF']}><StaffDashboard /></Protected>} />
        <Route path="/staff/verify" element={<Protected roles={['STAFF']}><Verify /></Protected>} />
        <Route path="/staff/claims" element={<Protected roles={['STAFF']}><ClaimQueue /></Protected>} />
        <Route path="/staff/storage" element={<Protected roles={['STAFF']}><Storage /></Protected>} />
        <Route path="/staff/insights" element={<Protected roles={['STAFF']}><StaffInsights /></Protected>} />
        <Route path="/staff/audit" element={<Protected roles={['STAFF']}><AuditLog /></Protected>} />

        <Route path="/admin/*" element={<Navigate to="/staff" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
