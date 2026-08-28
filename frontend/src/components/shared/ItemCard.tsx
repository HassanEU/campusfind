import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';

import { Badge, Card, StatusBadge } from '@/components/ui/primitives';
import { ScorePill } from './MatchScore';
import { cn, formatDate } from '@/lib/utils';

interface ItemCardProps {
  to?: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  dateLabel: string;
  status?: string;
  brand?: string | null;
  color?: string | null;
  score?: number | null;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * The one card used for lost reports, found items and search results, so a
 * student learns to read a single layout rather than three.
 */
export function ItemCard({
  to, title, description, category, location, date, dateLabel,
  status, brand, color, score, footer, className,
}: ItemCardProps) {
  const body = (
    <Card
      className={cn(
        'flex h-full flex-col p-4 transition-[border-color,box-shadow,transform] duration-200',
        to && 'group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-semibold">{title}</h3>
        {typeof score === 'number' ? <ScorePill score={score} className="shrink-0" /> : null}
      </div>

      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge>{category}</Badge>
        {brand ? <Badge>{brand}</Badge> : null}
        {color ? <Badge>{color}</Badge> : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{location}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden />
          <span className="sr-only">{dateLabel}: </span>
          {formatDate(date)}
        </span>
        {status ? <StatusBadge status={status} className="ml-auto" /> : null}
      </div>

      {footer ? <div className="mt-3 border-t border-border pt-3">{footer}</div> : null}
    </Card>
  );

  if (!to) return body;

  return (
    <Link
      to={to}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {body}
    </Link>
  );
}

/** Matches the ItemCard's shape so the grid does not jump when data arrives. */
export function ItemCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton mt-2.5 h-3 w-full" />
      <div className="skeleton mt-1.5 h-3 w-4/5" />
      <div className="mt-3.5 flex gap-1.5">
        <div className="skeleton h-4 w-16 rounded-full" />
        <div className="skeleton h-4 w-14 rounded-full" />
      </div>
      <div className="skeleton mt-4 h-3 w-1/2" />
    </Card>
  );
}
