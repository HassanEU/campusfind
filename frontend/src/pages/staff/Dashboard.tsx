import { Link } from 'react-router-dom';
import {
  ArrowRight, CalendarClock, CheckCircle2, Clock, PackageSearch, Plus, QrCode, ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorState, PageHeader,
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

  if (isError) {
    return (
      <div className="page">
        <ErrorState title="We could not load the desk overview" onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Lost &amp; found desk"
        description={`Good to see you, ${user?.fullName.split(' ')[0]}. Here is what needs attention today.`}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/app/report/found">
                <Plus />
                Log found item
              </Link>
            </Button>
            <Button asChild variant="primary">
              <Link to="/staff/verify">
                <QrCode />
                Verify &amp; return
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          label="Returned this week"
          value={counters?.returnedThisWeek ?? 0}
          hint="Back with their owners"
          icon={CheckCircle2}
          tone="success"
          loading={isLoading}
        />
        <Stat
          label="Average time to return"
          value={counters?.avgDaysToReturn != null ? `${counters.avgDaysToReturn}d` : '—'}
          hint="From handover to collection"
          icon={CalendarClock}
          loading={isLoading}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* ----------------------------- the queue --------------------------- */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Claims waiting for you</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">Oldest first.</p>
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
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-16" />
                ))}
              </div>
            ) : data?.queue.length ? (
              <ul className="space-y-2">
                {data.queue.map((claim) => (
                  <li key={claim.claimId}>
                    <Link
                      to="/staff/claims"
                      className="group flex items-center gap-3 rounded-md border border-border p-3 transition-colors hover:border-primary/40 hover:bg-surface-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{claim.foundItemName}</p>
                          {claim.matchScore ? <ScorePill score={claim.matchScore} /> : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {claim.claimantName} · submitted {formatRelative(claim.submittedAt)}
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
                description="No claims are waiting for review. Anything new will land here straight away."
              />
            )}
          </CardContent>
        </Card>

        {/* --------------------------- recent returns ------------------------ */}
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
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing has been returned yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
