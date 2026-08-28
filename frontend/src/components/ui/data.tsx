import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/* ================================= Tabs ================================== */

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'scroll-thin flex items-center gap-1 overflow-x-auto border-b border-border',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative -mb-px whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium',
      'text-muted-foreground transition-colors hover:text-foreground',
      'data-[state=active]:border-primary data-[state=active]:text-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = TabsPrimitive.Content;

/* ================================= Table ================================= */

/**
 * Tables scroll horizontally inside their own container rather than pushing
 * the page wide, which is what keeps narrow screens free of horizontal overflow.
 */
export function TableWrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('scroll-thin w-full overflow-x-auto rounded-2xl border border-border bg-surface', className)}>
      {children}
    </div>
  );
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full caption-bottom text-sm', className)} {...props} />;
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-border bg-surface-muted/60', className)} {...props} />;
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-surface-muted/50', className)} {...props} />;
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}

/* ============================== Pagination =============================== */

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-3 pt-1', className)}
    >
      <p className="text-xs text-muted-foreground tabular">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
        <span className="px-1 text-xs text-muted-foreground tabular">
          {page} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}

/* ============================== Stat tile ================================ */

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}) {
  const toneClasses = {
    neutral: 'text-muted-foreground bg-surface-muted',
    primary: 'text-primary bg-primary-subtle',
    success: 'text-success bg-success-subtle',
    warning: 'text-warning bg-warning-subtle',
    danger: 'text-danger bg-danger-subtle',
  }[tone];

  return (
    <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn('flex size-8 items-center justify-center rounded-xl', toneClasses)}>
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="skeleton mt-2.5 h-7 w-14" />
      ) : (
        <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular">{value}</p>
      )}

      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
