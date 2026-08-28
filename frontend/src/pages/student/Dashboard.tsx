import { Link } from 'react-router-dom';
import {
  ArrowRight, ClipboardList, PackageSearch, Plus, ShieldCheck, Sparkles, CheckCircle2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorState, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { Stat } from '@/components/ui/data';
import { ScorePill } from '@/components/shared/MatchScore';
import { useStudentDashboard } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatRelative } from '@/lib/utils';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useStudentDashboard();

  const counters = data?.counters;
  const firstName = user?.fullName.split(' ')[0] ?? 'there';

  if (isError) {
    return (
      <div className="page">
        <ErrorState
          title="We could not load your dashboard"
          description="The server did not respond. Check your connection and try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description="Everything you have reported, every match we found, and anything waiting on you."
        actions={
          <Button asChild variant="primary">
            <Link to="/app/report/lost">
              <Plus />
              Report lost item
            </Link>
          </Button>
        }
      />

      {/* Counters — every one of these is a COUNT(*) from PostgreSQL. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Reports filed"
          value={counters?.lostReports ?? 0}
          hint={counters ? `${counters.activeReports} still open` : undefined}
          icon={ClipboardList}
          loading={isLoading}
        />
        <Stat
          label="Potential matches"
          value={counters?.potentialMatches ?? 0}
          hint="Waiting for you to review"
          icon={PackageSearch}
          tone={counters?.potentialMatches ? 'primary' : 'neutral'}
          loading={isLoading}
        />
        <Stat
          label="Claims under review"
          value={counters?.openClaims ?? 0}
          hint="With the lost & found desk"
          icon={ShieldCheck}
          tone={counters?.openClaims ? 'warning' : 'neutral'}
          loading={isLoading}
        />
        <Stat
          label="Items returned"
          value={counters?.returnedItems ?? 0}
          hint="Back in your hands"
          icon={CheckCircle2}
          tone={counters?.returnedItems ? 'success' : 'neutral'}
          loading={isLoading}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* ------------------------------ matches ---------------------------- */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Your strongest matches</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Scored against everything currently at the desk.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/matches">
                View all
                <ArrowRight />
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="pt-3">
            {isLoading ? (
              <ul className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="rounded-md border border-border p-3.5">
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton mt-2 h-3 w-3/4" />
                  </li>
                ))}
              </ul>
            ) : data?.topMatches.length ? (
              <ul className="space-y-2">
                {data.topMatches.map((match) => (
                  <li key={match.matchId}>
                    <Link
                      to={`/app/matches/${match.matchId}`}
                      className="group flex items-center gap-4 rounded-md border border-border p-3.5 transition-colors hover:border-primary/40 hover:bg-surface-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{match.foundItemName}</p>
                          <ScorePill score={match.totalScore} />
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          Matches your “{match.lostItemName}” · found at {match.foundLocation} on{' '}
                          {formatDate(match.foundDate)}
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No potential matches yet"
                description="As soon as something similar to one of your reports is handed in, it will appear here with a score."
                action={
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/app/browse">Browse what is at the desk</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* ------------------------- claims + activity ----------------------- */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active claims</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {isLoading ? (
                <div className="skeleton h-16" />
              ) : data?.activeClaims.length ? (
                <ul className="space-y-2">
                  {data.activeClaims.map((claim) => (
                    <li
                      key={claim.claimId}
                      className="rounded-md border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium">{claim.foundItemName}</p>
                        <StatusBadge status={claim.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {formatRelative(claim.submittedAt)}
                      </p>
                    </li>
                  ))}
                  <li>
                    <Button asChild variant="ghost" size="sm" className="w-full">
                      <Link to="/app/claims">See all claims</Link>
                    </Button>
                  </li>
                </ul>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No active claims. Open a match to start one.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {isLoading ? (
                <div className="skeleton h-16" />
              ) : data?.notifications.length ? (
                <ul className="space-y-3">
                  {data.notifications.slice(0, 4).map((n) => (
                    <li key={n.notificationId} className="flex gap-2.5">
                      <span
                        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                          n.isRead ? 'bg-border' : 'bg-primary'
                        }`}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug">{n.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatRelative(n.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nothing has happened yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ------------------------------ shortcuts --------------------------- */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { to: '/app/report/lost', title: 'Report a lost item', body: 'Takes about a minute.', icon: ClipboardList },
          { to: '/app/report/found', title: 'Hand something in', body: 'Found something? Log it here.', icon: PackageSearch },
          { to: '/app/browse', title: 'Browse the desk', body: 'See everything waiting to be collected.', icon: Sparkles },
        ].map((shortcut) => (
          <Link
            key={shortcut.to}
            to={shortcut.to}
            className="group rounded-lg border border-border bg-surface p-4 shadow-xs transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
              <shortcut.icon className="size-4" />
            </span>
            <p className="mt-3 text-sm font-medium">{shortcut.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{shortcut.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
