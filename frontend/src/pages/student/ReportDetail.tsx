import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCheck, MapPin, RefreshCw, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorState, PageHeader, Separator, StatusBadge,
} from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/dialog';
import { ScorePill } from '@/components/shared/MatchScore';
import { useCloseLostItem, useLostItem, useRescanMatches } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime, formatTime, humanizeStatus } from '@/lib/utils';

export default function ReportDetail() {
  const { id } = useParams();
  const reportId = Number(id);

  const { data, isLoading, isError, refetch } = useLostItem(reportId);
  const rescan = useRescanMatches();
  const close = useCloseLostItem();
  const [closeOpen, setCloseOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="page max-w-4xl">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton mt-4 h-48" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="page max-w-4xl">
        <ErrorState
          title="We could not load this report"
          description="It may have been removed."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const { item, matches, history } = data;
  const openMatches = matches.filter((m) => m.matchStatus !== 'DISMISSED');

  async function handleRescan() {
    try {
      const result = await rescan.mutateAsync(reportId);
      toast.success(
        result.generated
          ? `Found ${result.generated} candidate${result.generated === 1 ? '' : 's'}`
          : 'No new candidates',
        {
          description: result.generated
            ? 'Scroll down to compare them.'
            : 'Nothing currently at the desk clears the 40-point threshold.',
        },
      );
    } catch (error) {
      toast.error('Could not re-run the match', {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      });
    }
  }

  async function handleClose() {
    try {
      await close.mutateAsync({ id: reportId, status: 'RESOLVED' });
      toast.success('Report closed');
      setCloseOpen(false);
    } catch (error) {
      toast.error('Could not close the report', {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="page max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/app/reports">
          <ArrowLeft />
          My reports
        </Link>
      </Button>

      <PageHeader
        title={item.itemName}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge status={item.status} />
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden />
              {item.locationName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              Lost {formatDate(item.lostDate)}
              {formatTime(item.lostTimeApprox) ? ` around ${formatTime(item.lostTimeApprox)}` : ''}
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" onClick={handleRescan} loading={rescan.isPending}>
              <RefreshCw />
              Re-run match
            </Button>
            {item.status !== 'RESOLVED' && item.status !== 'CLAIMED' ? (
              <Button variant="ghost" onClick={() => setCloseOpen(true)}>
                <CheckCheck />
                Close report
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {/* ---------------------------- matches --------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Potential matches</CardTitle>
              <p className="text-sm text-muted-foreground">
                Items at the desk scored against this report.
              </p>
            </CardHeader>

            <CardContent className="pt-2">
              {openMatches.length ? (
                <ul className="space-y-2">
                  {openMatches.map((match) => (
                    <li key={match.matchId}>
                      <Link
                        to={`/app/matches/${match.matchId}`}
                        className="group flex items-center gap-3 rounded-md border border-border p-3 transition-colors hover:border-primary/40 hover:bg-surface-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium">{match.foundItemName}</p>
                            <ScorePill score={match.totalScore} />
                            <StatusBadge status={match.matchStatus} />
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {match.foundLocation} · {formatDate(match.foundDate)}
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
                  title="No matches yet"
                  description="Nothing currently at the desk clears the 40-point threshold for this report."
                />
              )}
            </CardContent>
          </Card>

          {/* --------------------------- description ------------------------ */}
          <Card>
            <CardHeader>
              <CardTitle>What you reported</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex flex-wrap gap-1.5">
                <Badge>{item.categoryName}</Badge>
                {item.brand ? <Badge>{item.brand}</Badge> : null}
                {item.color ? <Badge>{item.color}</Badge> : null}
              </div>

              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </p>
                <p className="mt-1 text-sm leading-relaxed">{item.description}</p>
              </div>

              {item.identifyingDetails ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Identifying detail
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{item.identifyingDetails}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Only shown to lost &amp; found staff when they verify a claim.
                    </p>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* ----------------------------- history ---------------------------- */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>History</CardTitle>
            <p className="text-sm text-muted-foreground">
              Every recorded change to this report.
            </p>
          </CardHeader>

          <CardContent className="pt-2">
            <ol className="relative space-y-4 border-l border-border pl-4">
              {history.map((entry) => (
                <li key={entry.auditId} className="relative">
                  <span
                    className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary ring-4 ring-surface"
                    aria-hidden
                  />
                  <p className="text-sm font-medium">{humanizeStatus(entry.action)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </p>
                  {entry.details?.from ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {humanizeStatus(String(entry.details.from))} →{' '}
                      {humanizeStatus(String(entry.details.to))}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="Close this report?"
        description="Use this if you found the item yourself. The report stops being matched against new arrivals, and a closed report cannot be reopened."
        confirmLabel="Close report"
        loading={close.isPending}
        onConfirm={handleClose}
      />
    </div>
  );
}
