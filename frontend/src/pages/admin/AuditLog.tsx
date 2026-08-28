import * as React from 'react';
import {
  ArrowRightLeft, CheckCircle2, ClipboardList, FileSearch, PackageCheck,
  PackageSearch, QrCode, ShieldCheck, ShieldX, Sparkles, XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge, EmptyState, ErrorState, PageHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form';
import { Pagination } from '@/components/ui/data';
import { useAuditLogs } from '@/hooks/queries';
import { formatDateTime, initials } from '@/lib/utils';

const ACTIONS: { value: string; label: string }[] = [
  { value: 'LOST_ITEM_CREATED', label: 'Lost report filed' },
  { value: 'FOUND_ITEM_CREATED', label: 'Item handed in' },
  { value: 'MATCH_CREATED', label: 'Match generated' },
  { value: 'CLAIM_SUBMITTED', label: 'Claim submitted' },
  { value: 'CLAIM_APPROVED', label: 'Claim approved' },
  { value: 'CLAIM_REJECTED', label: 'Claim rejected' },
  { value: 'CLAIM_CANCELLED', label: 'Claim withdrawn' },
  { value: 'QR_VERIFIED', label: 'QR verified' },
  { value: 'ITEM_RETURNED', label: 'Item returned' },
  { value: 'STATUS_CHANGED', label: 'Status changed' },
];

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const ACTION_META: Record<string, { icon: LucideIcon; tone: Tone }> = {
  LOST_ITEM_CREATED: { icon: ClipboardList, tone: 'info' },
  FOUND_ITEM_CREATED: { icon: PackageSearch, tone: 'neutral' },
  MATCH_CREATED: { icon: Sparkles, tone: 'primary' },
  CLAIM_SUBMITTED: { icon: ShieldCheck, tone: 'warning' },
  CLAIM_APPROVED: { icon: CheckCircle2, tone: 'success' },
  CLAIM_REJECTED: { icon: XCircle, tone: 'danger' },
  CLAIM_CANCELLED: { icon: ShieldX, tone: 'neutral' },
  QR_VERIFIED: { icon: QrCode, tone: 'primary' },
  ITEM_RETURNED: { icon: PackageCheck, tone: 'success' },
  STATUS_CHANGED: { icon: ArrowRightLeft, tone: 'neutral' },
};

function label(action: string) {
  return ACTIONS.find((a) => a.value === action)?.label ?? action.replaceAll('_', ' ').toLowerCase();
}

/** Renders the JSONB details column as a short, readable line. */
function Details({ details }: { details: Record<string, unknown> | null }) {
  const parts = Object.entries(details ?? {})
    .filter(([, value]) => value !== null && value !== '' && typeof value !== 'object')
    .slice(0, 4)
    .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`);

  if (!parts.length) return null;

  return (
    <p className="mt-1 truncate font-mono text-2xs text-muted-foreground" title={parts.join(' · ')}>
      {parts.join(' · ')}
    </p>
  );
}

export default function AdminAudit() {
  const [action, setAction] = React.useState<string | undefined>(undefined);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => setPage(1), [action]);

  const { data, isLoading, isError, refetch } = useAuditLogs({ page, pageSize: 25, action });

  return (
    <div className="page">
      <PageHeader
        title="Audit trail"
        description="Every meaningful change is written to audit_logs by a database trigger, so this history cannot be bypassed by the API."
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={action ?? 'ALL'}
              onValueChange={(value) => setAction(value === 'ALL' ? undefined : value)}
            >
              <SelectTrigger className="w-[190px]" aria-label="Filter by action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All actions</SelectItem>
                {ACTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {action ? (
              <Button variant="ghost" size="sm" onClick={() => setAction(undefined)}>
                Clear
              </Button>
            ) : null}
          </div>
        }
      />

      {isError ? (
        <ErrorState title="We could not load the audit trail" onRetry={() => void refetch()} />
      ) : isLoading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="skeleton h-16" />
          ))}
        </div>
      ) : data?.data.length ? (
        <>
          <ol className="relative space-y-0 border-l border-border pl-0">
            {data.data.map((entry) => {
              const meta = ACTION_META[entry.action] ?? { icon: FileSearch, tone: 'neutral' as const };
              const Icon = meta.icon;

              return (
                <li key={entry.auditId} className="relative flex gap-3 py-3 pl-5">
                  <span
                    className="absolute -left-[9px] top-4 flex size-[18px] items-center justify-center rounded-full border border-border bg-surface-raised"
                    aria-hidden
                  >
                    <Icon className="size-2.5 text-muted-foreground" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge tone={meta.tone}>{label(entry.action)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {entry.entityType.replaceAll('_', ' ').toLowerCase()} #{entry.entityId}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2">
                      {entry.actorName ? (
                        <>
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[9px] font-semibold">
                            {initials(entry.actorName)}
                          </span>
                          <span className="truncate text-sm">
                            {entry.actorName}
                            {entry.actorRole ? (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                {entry.actorRole.toLowerCase()}
                              </span>
                            ) : null}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">System</span>
                      )}
                    </div>

                    <Details details={entry.details} />
                  </div>
                </li>
              );
            })}
          </ol>

          <Pagination
            className="mt-4"
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          icon={FileSearch}
          title="Nothing recorded for that action yet"
          description="Choose a different action or clear the filter to see the whole history."
        />
      )}
    </div>
  );
}
