import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ================================= Card ================================== */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface shadow-xs transition-[border-color,box-shadow] duration-200',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 px-5 pt-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 border-t border-border px-5 py-3.5', className)}
      {...props}
    />
  );
}

/* ================================ Badge ================================== */

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium leading-none',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-surface-muted text-muted-foreground',
        primary: 'border-primary/20 bg-primary-subtle text-primary',
        success: 'border-success/20 bg-success-subtle text-success',
        warning: 'border-warning/25 bg-warning-subtle text-warning',
        danger: 'border-danger/20 bg-danger-subtle text-danger',
        info: 'border-info/20 bg-info-subtle text-info',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/* ============================= StatusBadge =============================== */

/**
 * Every workflow state in CampusFind maps to exactly one colour, everywhere in
 * the product. A student learns the vocabulary once.
 */
const STATUS_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
  // lost items
  ACTIVE: 'info',
  MATCHED: 'primary',
  CLAIMED: 'warning',
  RESOLVED: 'success',
  // found items
  UNCLAIMED: 'neutral',
  CLAIM_PENDING: 'warning',
  VERIFIED: 'info',
  RETURNED: 'success',
  // claims
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
  // matches
  POTENTIAL: 'primary',
  CONFIRMED: 'success',
  DISMISSED: 'neutral',
  // verifications
  PASSED: 'success',
  FAILED: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Still missing',
  MATCHED: 'Match found',
  CLAIMED: 'Claim submitted',
  RESOLVED: 'Resolved',
  UNCLAIMED: 'In storage',
  CLAIM_PENDING: 'Claim pending',
  VERIFIED: 'Verified',
  RETURNED: 'Returned',
  PENDING: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Withdrawn',
  POTENTIAL: 'Potential match',
  CONFIRMED: 'Confirmed',
  DISMISSED: 'Dismissed',
  PASSED: 'Passed',
  FAILED: 'Failed',
};

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  if (!status) return null;
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} className={className}>
      <span
        className="size-1.5 rounded-full bg-current opacity-70"
        aria-hidden
      />
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

/* =============================== Separator =============================== */

export function Separator({
  className,
  orientation = 'horizontal',
}: {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
    />
  );
}

/* ================================ Skeleton =============================== */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden />;
}

/* ============================== Section head ============================= */

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/* ============================== Empty state ============================== */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted/40 px-6 py-14 text-center',
        className,
      )}
    >
      {Icon ? (
        <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-border bg-surface">
          <Icon className="size-[18px] text-muted-foreground" />
        </div>
      ) : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ============================== Error state ============================== */

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-danger/25 bg-danger-subtle px-6 py-12 text-center',
        className,
      )}
    >
      <p className="text-sm font-medium text-danger">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-danger/80">{description}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md border border-danger/30 bg-surface px-3 py-1.5 text-xs font-medium text-danger hover:bg-surface-muted"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
