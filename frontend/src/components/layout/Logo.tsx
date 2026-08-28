import { cn } from '@/lib/utils';

/**
 * Magnifier whose lens is also a location pin — "search" at 16px, "place" at 48px.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn('size-8', className)}>
      <rect width="32" height="32" rx="10" className="fill-primary" />
      <path
        d="M14 8a6 6 0 1 0 3.5 10.9l4.3 4.3a1.4 1.4 0 0 0 2-2l-4.3-4.3A6 6 0 0 0 14 8Zm0 2.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}

export function Logo({
  className,
  showText = true,
  size = 'md',
}: {
  className?: string;
  showText?: boolean;
  size?: 'md' | 'lg';
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={size === 'lg' ? 'size-11' : 'size-8'} />
      {showText ? (
        <span
          className={cn(
            'font-semibold tracking-tight',
            size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-[15px]',
          )}
        >
          Campus<span className="text-primary">Find</span>
        </span>
      ) : null}
    </span>
  );
}
