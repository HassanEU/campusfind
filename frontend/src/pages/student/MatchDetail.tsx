import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, Info, ShieldCheck, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, ErrorState, Separator, StatusBadge,
} from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, ConfirmDialog } from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/form';
import { ScoreBreakdown, ScoreRing } from '@/components/shared/MatchScore';
import { useDismissMatch, useMatch, useSubmitClaim } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { formatDate, scoreLabel } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Side-by-side comparison row                                                 */
/* -------------------------------------------------------------------------- */

function CompareRow({
  label,
  lost,
  found,
  match,
}: {
  label: string;
  lost: React.ReactNode;
  found: React.ReactNode;
  match?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-border py-2.5 last:border-0 sm:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)]">
      <p className="col-span-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-1 sm:text-xs sm:normal-case sm:font-medium sm:tracking-normal">
        {label}
      </p>
      <p className="min-w-0 break-words text-sm">{lost || <span className="text-muted-foreground">—</span>}</p>
      <p className="flex min-w-0 items-start gap-1.5 break-words text-sm">
        <span className="min-w-0">{found || <span className="text-muted-foreground">—</span>}</span>
        {match ? (
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-label="matches" />
        ) : null}
      </p>
    </div>
  );
}

export default function MatchDetail() {
  const { id } = useParams();
  const matchId = Number(id);
  const navigate = useNavigate();

  const { data: match, isLoading, isError, refetch } = useMatch(matchId);
  const submitClaim = useSubmitClaim();
  const dismissMatch = useDismissMatch();

  const [claimOpen, setClaimOpen] = React.useState(false);
  const [dismissOpen, setDismissOpen] = React.useState(false);
  const [claimDetails, setClaimDetails] = React.useState('');
  const [claimError, setClaimError] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="page max-w-4xl">
        <div className="skeleton h-8 w-52" />
        <div className="skeleton mt-4 h-40" />
        <div className="skeleton mt-4 h-64" />
      </div>
    );
  }

  if (isError || !match) {
    return (
      <div className="page max-w-4xl">
        <ErrorState
          title="We could not load this match"
          description="It may have been dismissed, or the item has already been returned."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const alreadyClaimed = Boolean(match.existingClaimId);
  const claimable =
    !alreadyClaimed &&
    match.matchStatus === 'POTENTIAL' &&
    ['UNCLAIMED', 'MATCHED'].includes(match.foundStatus);

  async function handleClaim() {
    if (!match) return;
    if (claimDetails.trim().length < 15) {
      setClaimError('Describe something specific enough to prove the item is yours (15+ characters).');
      return;
    }

    try {
      await submitClaim.mutateAsync({
        foundItemId: match.foundItemId,
        lostItemId: match.lostItemId,
        matchId: match.matchId,
        claimDetails: claimDetails.trim(),
      });
      setClaimOpen(false);
      toast.success('Claim submitted', {
        description: 'The lost & found desk will verify it against the physical item.',
      });
      navigate('/app/claims');
    } catch (error) {
      setClaimError(
        error instanceof ApiError ? error.message : 'Could not submit your claim. Please try again.',
      );
    }
  }

  async function handleDismiss() {
    if (!match) return;
    try {
      await dismissMatch.mutateAsync(match.matchId);
      toast.success('Match dismissed', { description: 'We will stop suggesting this item.' });
      navigate('/app/matches');
    } catch (error) {
      toast.error('Could not dismiss', {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="page max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/app/matches">
          <ArrowLeft />
          All matches
        </Link>
      </Button>

      {/* ------------------------------- headline ------------------------------ */}
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center sm:gap-7">
          <ScoreRing score={match.totalScore} size={104} showLabel={false} />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-xl font-semibold tracking-tight">{scoreLabel(match.totalScore)}</h1>
              <StatusBadge status={match.matchStatus} />
            </div>

            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Your report <span className="font-medium text-foreground">“{match.lostItemName}”</span>{' '}
              scored <span className="font-medium text-foreground tabular">{match.totalScore}</span> out
              of 100 against{' '}
              <span className="font-medium text-foreground">“{match.foundItemName}”</span>, handed in
              at {match.foundLocation} on {formatDate(match.foundDate)}.
            </p>
          </div>
        </div>

        {claimable ? (
          <div className="flex flex-col gap-2 border-t border-border bg-surface-muted/40 px-6 py-3.5 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setDismissOpen(true)}>
              <X />
              Not mine
            </Button>
            <Button variant="primary" onClick={() => setClaimOpen(true)}>
              <ShieldCheck />
              This is mine — submit a claim
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 border-t border-border bg-surface-muted/40 px-6 py-3.5">
            <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {alreadyClaimed
                ? 'You have already submitted a claim for this item.'
                : match.foundStatus === 'RETURNED'
                  ? 'This item has already been returned to its owner.'
                  : 'This item is currently being reviewed for another claim.'}
            </p>
            {alreadyClaimed ? (
              <Button asChild variant="ghost" size="sm" className="ml-auto shrink-0">
                <Link to="/app/claims">
                  View claim
                  <ArrowRight />
                </Link>
              </Button>
            ) : null}
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* --------------------------- comparison --------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>Side by side</CardTitle>
            <p className="text-sm text-muted-foreground">
              What you described, next to what was handed in.
            </p>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="mb-1 hidden grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-border pb-2 sm:grid">
              <span />
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your report
              </span>
              <span className="text-2xs font-semibold uppercase tracking-wider text-primary">
                Handed in
              </span>
            </div>

            <CompareRow label="Item" lost={match.lostItemName} found={match.foundItemName} />
            <CompareRow
              label="Category"
              lost={match.lostCategory}
              found={match.foundCategory}
              match={match.categoryScore > 0}
            />
            <CompareRow
              label="Brand"
              lost={match.lostBrand}
              found={match.foundBrand}
              match={match.brandScore > 0}
            />
            <CompareRow
              label="Colour"
              lost={match.lostColor}
              found={match.foundColor}
              match={match.colorScore > 0}
            />
            <CompareRow
              label="Location"
              lost={match.lostLocation}
              found={match.foundLocation}
              match={match.locationScore > 0}
            />
            <CompareRow
              label="Date"
              lost={formatDate(match.lostDate)}
              found={formatDate(match.foundDate)}
              match={match.timeScore >= 12}
            />
            <CompareRow
              label="Description"
              lost={match.lostDescription}
              found={match.foundDescription}
              match={match.descriptionScore >= 9}
            />
          </CardContent>
        </Card>

        {/* ---------------------------- breakdown --------------------------- */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How the score was built</CardTitle>
              <p className="text-sm text-muted-foreground">
                Six criteria, fixed weights, adding up to 100.
              </p>
            </CardHeader>

            <CardContent className="pt-2">
              <ScoreBreakdown breakdown={match.breakdown} />

              <Separator className="my-4" />

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-sm font-semibold tabular">{match.totalScore} / 100</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>In plain language</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {match.reasons.length ? (
                <ul className="space-y-2">
                  {match.reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                      <span className="text-muted-foreground">{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This pairing scored low on every criterion.
                </p>
              )}

              <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                The gap between the two dates is {Math.abs(match.dayGap)} day
                {Math.abs(match.dayGap) === 1 ? '' : 's'}. Scoring is rule-based and repeatable —
                the same two reports always produce the same number.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ------------------------------ claim dialog ---------------------------- */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit a claim</DialogTitle>
            <DialogDescription>
              Tell the desk something about this item that only its owner would know. Staff will
              check it against the item in front of them before releasing it.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 pb-4">
            {match.lostIdentifyingDetails ? (
              <div className="mb-4 rounded-md border border-border bg-surface-muted/60 p-3">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  You noted on your report
                </p>
                <p className="mt-1 text-sm leading-relaxed">{match.lostIdentifyingDetails}</p>
              </div>
            ) : null}

            <Field
              label="Proof of ownership"
              htmlFor="claimDetails"
              required
              error={claimError ?? undefined}
              hint={`${claimDetails.trim().length} / 15 characters minimum`}
            >
              <Textarea
                value={claimDetails}
                onChange={(e) => {
                  setClaimDetails(e.target.value);
                  setClaimError(null);
                }}
                placeholder="There is a deep scratch on the front of the charging case, near the status light."
                rows={4}
                maxLength={1000}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setClaimOpen(false)} disabled={submitClaim.isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleClaim} loading={submitClaim.isPending}>
              Submit claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------- dismiss dialog --------------------------- */}
      <ConfirmDialog
        open={dismissOpen}
        onOpenChange={setDismissOpen}
        title="Dismiss this match?"
        description="We will stop suggesting this item for your report. Your report stays open and future items will still be scored against it."
        confirmLabel="Dismiss match"
        tone="danger"
        loading={dismissMatch.isPending}
        onConfirm={handleDismiss}
      />
    </div>
  );
}
