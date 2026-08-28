import * as React from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle2, Keyboard, MapPin, PackageSearch, QrCode, ScanLine,
  ShieldCheck, User, XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Separator, StatusBadge,
} from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/form';
import { QrScanner } from '@/components/shared/QrScanner';
import { useDecideClaim, useQrLookup, useRecordVerification } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime, parseCampusFindCode } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';

type Decision = 'APPROVE' | 'REJECT' | null;

export default function Verify() {
  const lookup = useQrLookup();
  const recordVerification = useRecordVerification();
  const decide = useDecideClaim();
  const [searchParams, setSearchParams] = useSearchParams();

  const [code, setCode] = React.useState('');
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = React.useState('');
  const [verified, setVerified] = React.useState(false);
  const [decision, setDecision] = React.useState<Decision>(null);
  const autoLookupFor = React.useRef<string | null>(null);

  const item = lookup.data;

  const reset = React.useCallback(() => {
    lookup.reset();
    setCode('');
    setLookupError(null);
    setVerificationNotes('');
    setVerified(false);
    autoLookupFor.current = null;
    if (searchParams.has('code')) {
      setSearchParams({}, { replace: true });
    }
  }, [lookup, searchParams, setSearchParams]);

  /** One path for both the camera and the keyboard. */
  const runLookup = React.useCallback(
    async (rawCode: string) => {
      const normalised = parseCampusFindCode(rawCode);
      setLookupError(null);
      setVerified(false);
      setVerificationNotes('');

      if (!normalised) {
        setLookupError('A CampusFind code looks like CF-FOUND-000125.');
        return;
      }

      try {
        setCode(normalised);
        await lookup.mutateAsync(normalised);
      } catch (error) {
        setLookupError(
          error instanceof ApiError
            ? error.message
            : 'Could not look that code up. Please try again.',
        );
      }
    },
    [lookup],
  );

  // A printed QR opens /staff/verify?code=CF-FOUND-000125 — look it up as soon
  // as the screen mounts so a phone camera scan lands on the item, not an empty form.
  const pendingCode = searchParams.get('code');
  React.useEffect(() => {
    const extracted = pendingCode ? parseCampusFindCode(pendingCode) : null;
    if (!extracted || autoLookupFor.current === extracted) return;
    autoLookupFor.current = extracted;
    void runLookup(extracted);
  }, [pendingCode, runLookup]);

  async function handleVerification(outcome: 'PASSED' | 'FAILED') {
    if (!item?.claimId) return;

    try {
      await recordVerification.mutateAsync({
        claimId: item.claimId,
        method: 'QR_SCAN',
        qrCode: item.qrCode ?? undefined,
        outcome,
        notes: verificationNotes.trim() || undefined,
      });

      if (outcome === 'PASSED') {
        setVerified(true);
        toast.success('Verification recorded', {
          description: 'You can now approve or reject the claim.',
        });
      } else {
        toast.warning('Failed check recorded', {
          description: 'Reject the claim if the person cannot prove ownership.',
        });
      }
    } catch (error) {
      toast.error('Could not record the check', {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      });
    }
  }

  async function confirmDecision() {
    if (!item?.claimId || !decision) return;

    try {
      await decide.mutateAsync({
        id: item.claimId,
        action: decision,
        reviewNotes: verificationNotes.trim() || undefined,
      });

      toast.success(
        decision === 'APPROVE' ? 'Item released and marked returned' : 'Claim rejected',
        {
          description:
            decision === 'APPROVE'
              ? 'The claim, both item records, the return record and the audit entry were written together.'
              : 'The item is back on the shelf and available to other students.',
        },
      );

      setDecision(null);
      reset();
    } catch (error) {
      toast.error('Could not complete the decision', {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      });
      setDecision(null);
    }
  }

  return (
    <div className="page max-w-5xl">
      <PageHeader
        title="Verify &amp; return"
        description="Scan the label on the item, confirm the person in front of you, then approve or reject the claim."
      />

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* ------------------------------ scanner ---------------------------- */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="size-4 text-primary" />
                Scan the QR label
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-2">
              <QrScanner onScan={(scanned) => void runLookup(scanned)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="size-4 text-muted-foreground" />
                Or enter the code
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Works exactly the same when the camera is unavailable or the label is damaged.
              </p>
            </CardHeader>

            <CardContent className="pt-2">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void runLookup(code);
                }}
                className="space-y-3"
                noValidate
              >
                <Field
                  label="QR identifier"
                  htmlFor="qrCode"
                  error={lookupError ?? undefined}
                  hint="Printed underneath the QR square on the label."
                >
                  <Input
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value.toUpperCase());
                      setLookupError(null);
                    }}
                    placeholder="CF-FOUND-000125"
                    className="font-mono tracking-wider"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={lookup.isPending}
                >
                  <QrCode />
                  Look up item
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------- result ---------------------------- */}
        <div>
          {lookup.isPending ? (
            <Card className="p-5">
              <div className="skeleton h-5 w-1/3" />
              <div className="skeleton mt-3 h-4 w-2/3" />
              <div className="skeleton mt-6 h-24" />
            </Card>
          ) : lookupError && !item ? (
            <Card className="border-danger/25 bg-danger-subtle p-8 text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-surface text-danger">
                <XCircle className="size-5" />
              </span>
              <p className="mt-3 text-sm font-medium text-danger">Nothing found</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-danger/80">{lookupError}</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={reset}>
                Scan another item
              </Button>
            </Card>
          ) : item ? (
            <Card className="overflow-hidden">
              {/* item header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-success-subtle px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-success">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-2xs font-semibold uppercase tracking-wider text-success">
                      Item found
                    </p>
                    <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight">
                      {item.itemName}
                    </h2>
                  </div>
                </div>
                <code className="shrink-0 rounded-md border border-success/25 bg-surface px-2 py-1 font-mono text-xs font-semibold tracking-wider">
                  {item.qrCode}
                </code>
              </div>

              <CardContent className="space-y-4">
                <dl className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: 'Category', value: item.categoryName },
                    { label: 'Status', value: <StatusBadge status={item.status} /> },
                    { label: 'Found at', value: `${item.locationName}` },
                    { label: 'Found on', value: formatDate(item.foundDate) },
                    { label: 'Stored in', value: item.storageLocation ?? '—' },
                    { label: 'Times scanned', value: String(item.scanCount ?? 0) },
                  ].map((row) => (
                    <div key={row.label}>
                      <dt className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {row.label}
                      </dt>
                      <dd className="mt-1 text-sm">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </CardContent>

              {/* claim panel */}
              {item.claimId ? (
                <>
                  <Separator />

                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-base font-semibold">
                        <ShieldCheck className="size-4 text-warning" />
                        Claim awaiting verification
                      </h3>
                      <StatusBadge status={item.claimStatus ?? 'PENDING'} />
                    </div>

                    <div className="rounded-lg border border-border bg-surface-muted/50 p-4">
                      <div className="flex items-start gap-2.5">
                        <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{item.claimantName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[item.claimantEnrollment, item.claimantDepartment]
                              .filter(Boolean)
                              .join(' · ') || 'No enrollment details on file'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Claim submitted {formatDateTime(item.claimSubmittedAt)}
                          </p>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Their proof of ownership
                      </p>
                      <p className="mt-1 text-sm leading-relaxed">{item.claimDetails}</p>

                      {item.claimantIdentifyingDetails ? (
                        <>
                          <p className="mt-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                            What they wrote on their original report
                          </p>
                          <p className="mt-1 text-sm leading-relaxed">
                            {item.claimantIdentifyingDetails}
                          </p>
                        </>
                      ) : null}
                    </div>

                    {/* Step 1: record the physical check */}
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Badge tone={verified ? 'success' : 'warning'}>Step 1</Badge>
                        <p className="text-sm font-medium">Check the item against their claim</p>
                        {verified ? (
                          <CheckCircle2 className="ml-auto size-4 text-success" aria-label="done" />
                        ) : null}
                      </div>

                      <Field
                        label="Verification note"
                        htmlFor="verificationNotes"
                        className="mt-3"
                        hint="What you checked, and whether it matched. Stored with the claim as a permanent record."
                      >
                        <Textarea
                          value={verificationNotes}
                          onChange={(event) => setVerificationNotes(event.target.value)}
                          placeholder="Confirmed the scratch on the charging case and checked their student ID against the claim."
                          rows={3}
                          maxLength={1000}
                        />
                      </Field>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Button
                          variant="secondary"
                          onClick={() => void handleVerification('PASSED')}
                          loading={recordVerification.isPending}
                          disabled={verified}
                          className="flex-1"
                        >
                          <CheckCircle2 />
                          {verified ? 'Check recorded' : 'Record a passed check'}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => void handleVerification('FAILED')}
                          disabled={recordVerification.isPending}
                          className="text-danger hover:bg-danger-subtle hover:text-danger"
                        >
                          <XCircle />
                          Failed check
                        </Button>
                      </div>
                    </div>

                    {/* Step 2: the decision */}
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Badge tone={verified ? 'primary' : 'neutral'}>Step 2</Badge>
                        <p className="text-sm font-medium">Decide the claim</p>
                      </div>

                      {!verified ? (
                        <div className="mt-3 flex items-start gap-2.5 rounded-md border border-warning/25 bg-warning-subtle p-3">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                          <p className="text-xs leading-relaxed text-warning">
                            Record a passed check before approving. The API refuses an approval that
                            has no successful verification behind it.
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Button
                          variant="success"
                          className="flex-1"
                          disabled={!verified || decide.isPending}
                          onClick={() => setDecision('APPROVE')}
                        >
                          <CheckCircle2 />
                          Approve &amp; mark returned
                        </Button>
                        <Button
                          variant="danger"
                          className="flex-1"
                          disabled={decide.isPending}
                          onClick={() => setDecision('REJECT')}
                        >
                          <XCircle />
                          Reject claim
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent>
                  <EmptyState
                    icon={PackageSearch}
                    title="No claim on this item yet"
                    description="The label is valid and the item is on the shelf, but nobody has claimed it. There is nothing to verify."
                  />
                </CardContent>
              )}

              <div className="flex items-center gap-2 border-t border-border px-5 py-3">
                <MapPin className="size-3.5 text-muted-foreground" aria-hidden />
                <p className="text-xs text-muted-foreground">
                  Stored in {item.storageLocation ?? 'the lost & found desk'}
                </p>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>
                  Scan another item
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="flex min-h-[400px] items-center justify-center p-8">
              <div className="max-w-sm text-center">
                <span className="mx-auto flex size-11 items-center justify-center rounded-full border border-border bg-surface-muted">
                  <QrCode className="size-5 text-muted-foreground" />
                </span>
                <p className="mt-3 text-sm font-medium">Ready when you are</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Scan the label attached to the item, or type its code. The record loads straight
                  from the database along with any claim waiting on it.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ---------------------------- confirmations ---------------------------- */}
      <ConfirmDialog
        open={decision === 'APPROVE'}
        onOpenChange={(open) => !open && setDecision(null)}
        title="Approve this claim and release the item?"
        description={
          <>
            This hands <span className="font-medium text-foreground">{item?.itemName}</span> to{' '}
            <span className="font-medium text-foreground">{item?.claimantName}</span>. In one
            transaction the claim is approved, the item becomes RETURNED, the matching lost report is
            resolved, a return record is written and the audit trail is updated.{' '}
            <span className="font-medium text-foreground">This cannot be undone.</span>
          </>
        }
        confirmLabel="Approve & release"
        tone="success"
        loading={decide.isPending}
        onConfirm={confirmDecision}
      />

      <ConfirmDialog
        open={decision === 'REJECT'}
        onOpenChange={(open) => !open && setDecision(null)}
        title="Reject this claim?"
        description={
          <>
            <span className="font-medium text-foreground">{item?.claimantName}</span> will be
            notified that their claim was not approved, and the item goes back on the shelf for
            others to claim. Your verification note is sent with the decision.
          </>
        }
        confirmLabel="Reject claim"
        tone="danger"
        loading={decide.isPending}
        onConfirm={confirmDecision}
      />
    </div>
  );
}
