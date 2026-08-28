import { Link } from 'react-router-dom';
import { ArrowRight, PackageSearch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, EmptyState, ErrorState, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { ScoreRing } from '@/components/shared/MatchScore';
import { ItemCardSkeleton } from '@/components/shared/ItemCard';
import { useMatches } from '@/hooks/queries';
import { formatDate } from '@/lib/utils';

export default function Matches() {
  const { data: matches, isLoading, isError, refetch } = useMatches();

  return (
    <div className="page">
      <PageHeader
        title="Potential matches"
        description="Items handed in at the desk that scored highly against your reports. Open one to compare the details side by side."
      />

      {isError ? (
        <ErrorState
          title="We could not load your matches"
          description="The server did not respond. Please try again."
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      ) : matches?.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {matches.map((match) => (
            <li key={match.matchId}>
              <Link
                to={`/app/matches/${match.matchId}`}
                className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="flex h-full gap-4 p-4 transition-[border-color,box-shadow] group-hover:border-primary/40 group-hover:shadow-sm">
                  <ScoreRing score={match.totalScore} size={72} showLabel={false} />

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 truncate text-sm font-semibold">
                        {match.foundItemName}
                      </h3>
                      <StatusBadge status={match.matchStatus} className="shrink-0" />
                    </div>

                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      Matches your “{match.lostItemName}”
                    </p>

                    <ul className="mt-2.5 space-y-1">
                      {match.reasons.slice(0, 2).map((reason) => (
                        <li
                          key={reason}
                          className="flex items-start gap-1.5 text-xs text-muted-foreground"
                        >
                          <span
                            className="mt-1.5 size-1 shrink-0 rounded-full bg-success"
                            aria-hidden
                          />
                          <span className="line-clamp-1">{reason}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
                      <span className="truncate">
                        {match.foundLocation} · {formatDate(match.foundDate)}
                      </span>
                      <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={PackageSearch}
          title="No potential matches found yet"
          description="Nothing at the desk resembles your reports right now. Every new item handed in is scored against them automatically, and you will be notified if something fits."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="primary" size="sm">
                <Link to="/app/report/lost">Report another item</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link to="/app/browse">Browse the desk yourself</Link>
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
