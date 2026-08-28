import { cn } from '@/lib/utils';

/**
 * The CampusFind mark: a magnifier whose lens is also a location pin. It reads
 * as "search" at 16px and as "campus place" at 40px.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn('size-7', className)}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M14 8a6 6 0 1 0 3.5 10.9l4.3 4.3a1.4 1.4 0 0 0 2-2l-4.3-4.3A6 6 0 0 0 14 8Zm0 2.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      {showText ? (
        <span className="text-[15px] font-semibold tracking-tight">
          Campus<span className="text-primary">Find</span>
        </span>
      ) : null}
    </span>
  );
}
