import { motion, useReducedMotion } from 'framer-motion';
import { cn, scoreLabel, scoreTone } from '@/lib/utils';
import type { MatchBreakdownItem } from '@/types';

const TONE_TEXT = {
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  muted: 'text-muted-foreground',
} as const;

const TONE_STROKE = {
  success: 'stroke-success',
  info: 'stroke-info',
  warning: 'stroke-warning',
  muted: 'stroke-muted-foreground',
} as const;

const TONE_BAR = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  muted: 'bg-muted-foreground',
} as const;

/**
 * The headline score, drawn as a ring that fills to the score.
 * The number is the accessible source of truth; the ring is decoration.
 */
export function ScoreRing({
  score,
  size = 96,
  showLabel = true,
  className,
}: {
  score: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const tone = scoreTone(score);
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(score, 100) / 100);

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={6}
            className="stroke-border"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={6}
            strokeLinecap="round"
            className={TONE_STROKE[tone]}
            strokeDasharray={circumference}
            initial={reduceMotion ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn('font-semibold tabular leading-none', TONE_TEXT[tone])}
            style={{ fontSize: size / 3.6 }}
          >
            {Math.round(score)}
          </span>
          <span className="mt-0.5 text-2xs text-muted-foreground">/ 100</span>
        </div>
      </div>

      {showLabel ? (
        <p className={cn('mt-2 text-xs font-medium', TONE_TEXT[tone])}>{scoreLabel(score)}</p>
      ) : null}
    </div>
  );
}

/** Compact inline score for list rows. */
export function ScorePill({ score, className }: { score: number; className?: string }) {
  const tone = scoreTone(score);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-semibold tabular',
        {
          success: 'border-success/20 bg-success-subtle text-success',
          info: 'border-info/20 bg-info-subtle text-info',
          warning: 'border-warning/25 bg-warning-subtle text-warning',
          muted: 'border-border bg-surface-muted text-muted-foreground',
        }[tone],
        className,
      )}
    >
      {Math.round(score)}% match
    </span>
  );
}

/**
 * The six-criterion breakdown. Each bar shows what fraction of that criterion's
 * weight was earned, and the raw points are printed so the arithmetic can be
 * checked by hand.
 */
export function ScoreBreakdown({ breakdown }: { breakdown: MatchBreakdownItem[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <ul className="space-y-3">
      {breakdown.map((item, index) => {
        const tone = item.percent >= 80 ? 'success' : item.percent >= 40 ? 'info' : 'muted';

        return (
          <li key={item.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground tabular">
                <span className="font-medium text-foreground">{item.earned}</span> / {item.weight} pts
              </span>
            </div>

            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
              <motion.div
                className={cn('h-full rounded-full', TONE_BAR[tone])}
                initial={reduceMotion ? { width: `${item.percent}%` } : { width: 0 }}
                animate={{ width: `${item.percent}%` }}
                transition={{
                  duration: 0.5,
                  delay: reduceMotion ? 0 : 0.06 * index,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
