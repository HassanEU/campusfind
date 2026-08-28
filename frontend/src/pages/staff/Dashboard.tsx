import { Link } from 'react-router-dom';
import {
  ArrowRight, CalendarClock, CheckCircle2, Clock, ClipboardList, PackageSearch, Plus, QrCode, ShieldCheck, Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorState, StatusBadge,
} from '@/components/ui/primitives';
import { Stat } from '@/components/ui/data';
import { ScorePill } from '@/components/shared/MatchScore';
import { useStaffDashboard } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatRelative } from '@/lib/utils';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useStaffDashboard();
  const counters = data?.counters;
  const firstName = user?.fullName.split(' ')[0] ?? 'there';

  if (isError) {
    return (
      <div className="page">
        <ErrorState title="We could not load the desk" onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="page">
      <section className="relative overflow-hidden rounded-[28px] border border-border/80 bg-surface p-6 shadow-xs sm:p-8">
        <div className="hero-mesh pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-primary">Lost &amp; found desk</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Good to see you, {firstName}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Review claims, verify ownership with a QR scan, and mark items returned.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="secondary" size="lg">
              <Link to="/app/report/found">
                <Plus />
                Log found item
              </Link>
            </Button>
            <Button asChild variant="primary" size="lg">
              <Link to="/staff/verify">
                <QrCode />
                Verify &amp; return
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Claims to review"
          value={counters?.pendingClaims ?? 0}
          hint="Waiting on the desk"
          icon={ShieldCheck}
          tone={counters?.pendingClaims ? 'warning' : 'success'}
          loading={isLoading}
        />
        <Stat
          label="Items in storage"
          value={counters?.itemsInStorage ?? 0}
          hint={counters ? `${counters.newThisWeek} handed in this week` : undefined}
          icon={PackageSearch}
          loading={isLoading}
        />
        <Stat
          label="Awaiting verification"
          value={counters?.awaitingVerification ?? 0}
          hint="Claim pending a QR check"
          icon={QrCode}
          tone={counters?.awaitingVerification ? 'warning' : 'neutral'}
          loading={isLoading}
        />
        <Stat
          label="Returned this week"
          value={counters?.returnedThisWeek ?? 0}
          hint={
            counters?.avgDaysToReturn != null
              ? `Avg ${counters.avgDaysToReturn}d to return`
              : 'Back with their owners'
          }
          icon={counters?.avgDaysToReturn != null ? CalendarClock : CheckCircle2}
          tone="success"
          loading={isLoading}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Pending claims</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">Oldest first — review, verify, approve or reject.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/staff/claims">
                Full queue
                <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}</div>
            ) : data?.queue.length ? (
              <ul className="space-y-2">
                {data.queue.map((claim) => (
                  <li key={claim.claimId}>
                    <Link
                      to="/staff/claims"
                      className="group flex items-center gap-3 rounded-2xl border border-border/80 p-3.5 transition-colors hover:border-primary/40 hover:bg-surface-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{claim.foundItemName}</p>
                          {claim.matchScore ? <ScorePill score={claim.matchScore} /> : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {claim.claimantName} · {formatRelative(claim.submittedAt)}
                          {claim.qrCode ? ` · ${claim.qrCode}` : ''}
                        </p>
                      </div>
                      <Clock className="size-4 shrink-0 text-warning" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="The queue is clear"
                description="No claims are waiting for review."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Potential matches</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">Highest scores first.</p>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoading ? (
              <div className="skeleton h-24" />
            ) : data?.potentialMatches?.length ? (
              <ul className="space-y-2">
                {data.potentialMatches.map((match) => (
                  <li key={match.matchId} className="rounded-2xl border border-border/80 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{match.foundItemName}</p>
                      <ScorePill score={match.totalScore} />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      vs “{match.lostItemName}” · {match.foundLocation}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Sparkles} title="No open matches" description="New hand-ins will be scored automatically." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Lost reports</CardTitle>
            <ClipboardList className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-3">
            {isLoading ? (
              <div className="skeleton h-24" />
            ) : data?.recentLost?.length ? (
              <ul className="space-y-2">
                {data.recentLost.map((item) => (
                  <li key={item.lostItemId} className="rounded-2xl border border-border/80 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium">{item.itemName}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.reporterName} · {item.locationName} · {formatDate(item.lostDate)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No lost reports yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Found items</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/staff/storage">Storage</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoading ? (
              <div className="skeleton h-24" />
            ) : data?.recentFound?.length ? (
              <ul className="space-y-2">
                {data.recentFound.map((item) => (
                  <li key={item.foundItemId} className="rounded-2xl border border-border/80 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium">{item.itemName}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.locationName} · {formatDate(item.foundDate)}
                      {item.qrCode ? ` · ${item.qrCode}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No found items yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently returned</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoading ? (
              <div className="skeleton h-24" />
            ) : data?.recentReturns.length ? (
              <ul className="divide-y divide-border">
                {data.recentReturns.map((record) => (
                  <li key={record.returnId} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="truncate text-sm font-medium">{record.itemName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      To {record.returnedToName} · {formatDate(record.returnedAt)} · after{' '}
                      {record.daysInStorage}d in storage
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing has been returned yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
