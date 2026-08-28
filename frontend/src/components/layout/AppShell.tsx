import * as React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import {
  Bell, ClipboardList, LayoutDashboard, LogOut, Menu, Moon, PackageSearch,
  QrCode, ScrollText, Search, Settings, ShieldCheck, Sparkles, Sun, X,
} from 'lucide-react';

import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/useAuth';
import { useMarkAllRead, useMarkNotificationRead, useNotifications } from '@/hooks/queries';
import { homeFor, isDeskRole, roleAllowed, roleLabel } from '@/lib/roles';
import { cn, formatRelative, initials } from '@/lib/utils';
import type { Role } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
  section: string;
}

/** One list drives the sidebar, the mobile drawer and the bottom bar. */
const NAV: NavItem[] = [
  { to: '/app', label: 'Home', icon: LayoutDashboard, roles: ['STUDENT'], section: 'Your campus' },
  { to: '/app/reports', label: 'My reports', icon: ClipboardList, roles: ['STUDENT'], section: 'Your campus' },
  { to: '/app/matches', label: 'Matches', icon: PackageSearch, roles: ['STUDENT'], section: 'Your campus' },
  { to: '/app/claims', label: 'My claims', icon: ShieldCheck, roles: ['STUDENT'], section: 'Your campus' },
  { to: '/app/browse', label: 'Browse found items', icon: Search, roles: ['STUDENT', 'STAFF'], section: 'Campus' },

  { to: '/staff', label: 'Desk', icon: LayoutDashboard, roles: ['STAFF'], section: 'Lost & found desk' },
  { to: '/staff/verify', label: 'Verify & return', icon: QrCode, roles: ['STAFF'], section: 'Lost & found desk' },
  { to: '/staff/claims', label: 'Claim queue', icon: ShieldCheck, roles: ['STAFF'], section: 'Lost & found desk' },
  { to: '/staff/storage', label: 'Storage', icon: PackageSearch, roles: ['STAFF'], section: 'Lost & found desk' },
  { to: '/staff/insights', label: 'Insights', icon: Sparkles, roles: ['STAFF'], section: 'Operations' },
  { to: '/staff/audit', label: 'Audit log', icon: ScrollText, roles: ['STAFF'], section: 'Operations' },
];

/* ------------------------------- dark mode -------------------------------- */

function useTheme() {
  const [dark, setDark] = React.useState(() => {
    const stored = localStorage.getItem('campusfind.theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('campusfind.theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

/* ------------------------------ notifications ----------------------------- */

function NotificationBell() {
  const { user } = useAuth();
  const { data = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const unread = data.filter((n) => !n.isRead).length;

  const routeFor = (type: string | null, id: number | null) => {
    if (type === 'CLAIM') return isDeskRole(user?.role) ? '/staff/claims' : '/app/claims';
    if (type === 'LOST_ITEM' && id) return isDeskRole(user?.role) ? '/staff' : `/app/reports/${id}`;
    return null;
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Bell />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex size-2 items-center justify-center">
              <span className="size-2 rounded-full bg-primary ring-2 ring-surface" />
            </span>
          ) : null}
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className={cn(
            'z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-popover',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="scroll-thin max-h-[340px] overflow-y-auto">
            {data.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nothing yet. We will let you know when a match or a decision arrives.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.map((n) => {
                  const route = routeFor(n.relatedEntityType, n.relatedEntityId);
                  return (
                    <li key={n.notificationId}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!n.isRead) markRead.mutate(n.notificationId);
                          if (route) {
                            setOpen(false);
                            navigate(route);
                          }
                        }}
                        className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted"
                      >
                        <span
                          className={cn(
                            'mt-1.5 size-1.5 shrink-0 rounded-full',
                            n.isRead ? 'bg-transparent' : 'bg-primary',
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{n.title}</span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                            {n.body}
                          </span>
                          <span className="mt-1 block text-2xs text-muted-foreground">
                            {formatRelative(n.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* --------------------------------- avatar --------------------------------- */

function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const roleName = roleLabel(user.role);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Account menu"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-2xs font-semibold text-primary-foreground">
            {initials(user.fullName)}
          </span>
          <span className="hidden text-sm font-medium sm:block">{user.fullName.split(' ')[0]}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-60 overflow-hidden rounded-2xl border border-border bg-surface-raised p-1 shadow-popover data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <Badge tone="primary" className="mt-2">{roleName}</Badge>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            onSelect={() => navigate('/app/profile')}
            className="flex cursor-default items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none focus:bg-surface-muted"
          >
            <Settings className="size-4 text-muted-foreground" />
            Profile &amp; activity
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={() => {
              signOut();
              navigate('/');
            }}
            className="flex cursor-default items-center gap-2 rounded-sm px-3 py-2 text-sm text-danger outline-none focus:bg-danger-subtle"
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* -------------------------------- sidebar --------------------------------- */

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  if (!user) return null;

  const items = NAV.filter((item) => roleAllowed(user.role, item.roles));
  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <nav className="flex flex-col gap-6 py-4" aria-label="Main">
      {sections.map((section) => (
        <div key={section}>
          <p className="px-3 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section}
          </p>
          <ul className="space-y-0.5">
            {items
              .filter((i) => i.section === section)
              .map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/app' || item.to === '/staff' || item.to === '/admin'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-subtle text-primary'
                          : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* ------------------------------- app shell -------------------------------- */

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const reduceMotion = useReducedMotion();

  // Close the drawer whenever the route changes.
  React.useEffect(() => setMobileOpen(false), [location.pathname]);

  const primaryAction =
    user?.role === 'STUDENT'
      ? { to: '/app/report/lost', label: 'Report lost item' }
      : { to: '/app/report/found', label: 'Log found item' };

  return (
    <div className="min-h-dvh bg-background">
      {/* Skip link: the first thing a keyboard user reaches. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu />
          </Button>

          <Link to={homeFor(user?.role)} className="shrink-0 rounded-md">
            <Logo />
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="primary" size="sm" className="hidden sm:inline-flex">
              <Link to={primaryAction.to}>{primaryAction.label}</Link>
            </Button>
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-border px-3 lg:block scroll-thin">
          <SidebarNav />
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[2px] lg:hidden"
                onClick={() => setMobileOpen(false)}
                aria-hidden
              />
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { x: '-100%' }}
                animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { x: '-100%' }}
                transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.25 }}
                className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-border bg-surface px-3 lg:hidden scroll-thin"
                role="dialog"
                aria-label="Navigation"
              >
                <div className="flex h-14 items-center justify-between">
                  <Logo />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close navigation menu"
                  >
                    <X />
                  </Button>
                </div>
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
                <div className="border-t border-border py-4">
                  <Button asChild variant="primary" className="w-full">
                    <Link to={primaryAction.to}>{primaryAction.label}</Link>
                  </Button>
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>

        <main id="main" className="min-w-0 flex-1 pb-20 lg:pb-0">
          {/* Page transition: a short fade so navigation feels connected
              without making the user wait for an animation. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}

/**
 * On phones the sidebar is replaced by a bottom bar carrying the four things a
 * user actually does, rather than a shrunken copy of the desktop navigation.
 */
function MobileTabBar() {
  const { user } = useAuth();
  if (!user) return null;

  const tabs =
    user.role === 'STUDENT'
      ? [
          { to: '/app', label: 'Home', icon: LayoutDashboard, end: true },
          { to: '/app/matches', label: 'Matches', icon: PackageSearch, end: false },
          { to: '/app/report/lost', label: 'Report', icon: ClipboardList, end: false },
          { to: '/app/claims', label: 'Claims', icon: ShieldCheck, end: false },
        ]
      : [
          { to: '/staff', label: 'Desk', icon: LayoutDashboard, end: true },
          { to: '/staff/verify', label: 'Verify', icon: QrCode, end: false },
          { to: '/staff/claims', label: 'Claims', icon: ShieldCheck, end: false },
          { to: '/staff/storage', label: 'Storage', icon: PackageSearch, end: false },
        ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Quick navigation"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-2xs font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <tab.icon className="size-[18px]" />
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
