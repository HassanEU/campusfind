import * as React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, Clock, MapPin, ShieldCheck, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card, EmptyState, ErrorState, PageHeader, Separator, StatusBadge,
} from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useClaims, useDecideClaim } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime, formatRelative } from '@/lib/utils';
import type { Claim } from '@/types';

/** Explains, in one sentence, what is happening right now with a claim. */
function statusNarrative(claim: Claim) {
  switch (claim.status) {
    case 'PENDING':
      return {
        icon: Clock,
        tone: 'text-warning',
        text: 'Waiting for the lost & found desk to verify the item against your description.',
      };
    case 'APPROVED':
      return {
        icon: CheckCircle2,
        tone: 'text-success',
        text: `Approved by ${claim.reviewerName ?? 'the desk'}. Collect the item from ${claim.storageLocation}.`,
      };
    case 'REJECTED':
      return {
        icon: XCircle,
        tone: 'text-danger',
        text: claim.reviewNotes ?? 'The details you provided did not match the item held at the desk.',
      };
    default:
      return {
        icon: XCircle,
        tone: 'text-muted-foreground',
        text: 'You withdrew this claim. The item went back onto the shelf.',
      };
  }
}

export default function MyClaims() {
  const { data: claims, isLoading, isError, refetch } = useClaims();
  const decide = useDecideClaim();
  const [cancelling, setCancelling] = React.useState<Claim | null>(null);

  async function handleCancel() {
    if (!cancelling) return;
    try {
      await decide.mutateAsync({ id: cancelling.claimId, action: 'CANCEL' });
      toast.success('Claim withdrawn', { description: 'The item is available to others again.' });
      setCancelling(null);
    } catch (error) {
      toast.error('Could not withdraw the claim', {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="My claims"
        description="Every request you have made to collect an item, and where each one stands."
      />

      {isError ? (
        <ErrorState
          title="We could not load your claims"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Card key={i} className="p-5">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton mt-3 h-3 w-2/3" />
            </Card>
          ))}
        </div>
      ) : claims?.length ? (
        <ul className="space-y-3">
          {claims.map((claim) => {
            const narrative = statusNarrative(claim);
            return (
              <li key={claim.claimId}>
                <Card className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">{claim.foundItemName}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-3.5" aria-hidden />
                          Found at {claim.foundLocation}
                        </span>
                        <span>·</span>
                        <span>{formatDate(claim.foundDate)}</span>
                        {claim.matchScore ? (
                          <>
                            <span>·</span>
                            <span className="tabular">{Math.round(claim.matchScore)}% match</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <StatusBadge status={claim.status} />
                  </div>

                  <div className="px-5 pb-4">
                    <div className="flex items-start gap-2.5 rounded-md border border-border bg-surface-muted/50 p-3">
                      <narrative.icon
                        className={`mt-0.5 size-4 shrink-0 ${narrative.tone}`}
                        aria-hidden
                      />
                      <p className="text-sm leading-relaxed">{narrative.text}</p>
                    </div>

                    <Separator className="my-3.5" />

                    <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                      What you told the desk
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {claim.claimDetails}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3">
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatRelative(claim.submittedAt)}
                      {claim.reviewedAt ? ` · Decided ${formatDateTime(claim.reviewedAt)}` : ''}
                    </p>

                    {claim.status === 'PENDING' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-danger hover:bg-danger-subtle hover:text-danger"
                        onClick={() => setCancelling(claim)}
                      >
                        Withdraw claim
                      </Button>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="No active claims"
          description="When one of your matches looks right, open it and submit a claim. The desk will verify it before handing the item over."
          action={
            <Button asChild variant="primary" size="sm">
              <Link to="/app/matches">Review my matches</Link>
            </Button>
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Withdraw this claim?"
        description={
          <>
            The desk will stop reviewing it and{' '}
            <span className="font-medium text-foreground">{cancelling?.foundItemName}</span> becomes
            available for other students to claim. You can submit a new claim later.
          </>
        }
        confirmLabel="Withdraw claim"
        tone="danger"
        loading={decide.isPending}
        onConfirm={handleCancel}
      />
    </div>
  );
}
