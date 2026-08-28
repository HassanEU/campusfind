import * as React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, QrCode, ShieldCheck, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card, EmptyState, ErrorState, PageHeader, Separator, StatusBadge,
} from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/data';
import { Field, Textarea } from '@/components/ui/form';
import { ScorePill } from '@/components/shared/MatchScore';
import { useClaims, useDecideClaim } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime, formatRelative } from '@/lib/utils';
import type { Claim } from '@/types';

const TABS = [
  { value: 'PENDING', label: 'Awaiting review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'all', label: 'Everything' },
];

export default function ClaimQueue() {
  const [tab, setTab] = React.useState('PENDING');
  const { data: claims, isLoading, isError, refetch } = useClaims(tab === 'all' ? undefined : tab);
  const decide = useDecideClaim();

  const [rejecting, setRejecting] = React.useState<Claim | null>(null);
  const [notes, setNotes] = React.useState('');

  async function handleReject() {
    if (!rejecting) return;
    try {
      await decide.mutateAsync({
        id: rejecting.claimId,
        action: 'REJECT',
        reviewNotes: notes.trim() || undefined,
      });
      toast.success('Claim rejected', { description: 'The item is available again.' });
      setRejecting(null);
      setNotes('');
    } catch (error) {
      toast.error('Could not reject the claim', {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Claim queue"
        description="Requests from students to collect an item. Approving one requires a passed verification, which happens on the verify screen."
        actions={
          <Button asChild variant="primary">
            <Link to="/staff/verify">
              <QrCode />
              Verify an item
            </Link>
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isError ? (
        <ErrorState title="We could not load the claim queue" onRetry={() => void refetch()} />
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
          {claims.map((claim) => (
            <li key={claim.claimId}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{claim.foundItemName}</h3>
                      {claim.matchScore ? <ScorePill score={claim.matchScore} /> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Claimed by {claim.claimantName}
                      {claim.claimantEnrollment ? ` (${claim.claimantEnrollment})` : ''} ·{' '}
                      {formatRelative(claim.submittedAt)}
                    </p>
                  </div>
                  <StatusBadge status={claim.status} />
                </div>

                <div className="grid gap-4 px-5 pb-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-surface-muted/50 p-3">
                    <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Their proof of ownership
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{claim.claimDetails}</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface-muted/50 p-3">
                    <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {claim.identifyingDetails ? 'From their original report' : 'Item details'}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">
                      {claim.identifyingDetails ??
                        `${claim.categoryName} · found at ${claim.foundLocation} on ${formatDate(claim.foundDate)}`}
                    </p>
                  </div>
                </div>

                {claim.reviewNotes ? (
                  <>
                    <Separator />
                    <div className="px-5 py-3">
                      <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Decision note
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{claim.reviewNotes}</p>
                    </div>
                  </>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
                  <p className="text-xs text-muted-foreground">
                    {claim.qrCode ? (
                      <code className="font-mono">{claim.qrCode}</code>
                    ) : (
                      'No QR label'
                    )}
                    {claim.reviewedAt
                      ? ` · Decided by ${claim.reviewerName} on ${formatDateTime(claim.reviewedAt)}`
                      : ` · Stored in ${claim.storageLocation}`}
                  </p>

                  {claim.status === 'PENDING' ? (
                    <div className="ml-auto flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-subtle hover:text-danger"
                        onClick={() => {
                          setRejecting(claim);
                          setNotes('');
                        }}
                      >
                        <XCircle />
                        Reject
                      </Button>
                      <Button asChild variant="primary" size="sm">
                        <Link to="/staff/verify">
                          <QrCode />
                          Verify to approve
                        </Link>
                      </Button>
                    </div>
                  ) : claim.status === 'APPROVED' ? (
                    <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-success">
                      <CheckCircle2 className="size-3.5" />
                      Item released
                    </span>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title={tab === 'PENDING' ? 'No claims waiting' : 'Nothing to show here'}
          description={
            tab === 'PENDING'
              ? 'Every claim has been dealt with. New ones will appear here the moment a student submits them.'
              : 'No claims have reached this state yet.'
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => !open && setRejecting(null)}
        title="Reject this claim?"
        description={
          <>
            <span className="font-medium text-foreground">{rejecting?.claimantName}</span> will be
            told their claim was not approved, and{' '}
            <span className="font-medium text-foreground">{rejecting?.foundItemName}</span> goes back
            on the shelf.
          </>
        }
        confirmLabel="Reject claim"
        tone="danger"
        loading={decide.isPending}
        onConfirm={handleReject}
      >
        <Field
          label="Reason"
          htmlFor="rejectNotes"
          hint="Sent to the student with the decision. Be specific but do not reveal the identifying detail."
        >
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="The description of the item did not match what is held at the desk."
            rows={3}
            maxLength={1000}
          />
        </Field>
      </ConfirmDialog>
    </div>
  );
}
