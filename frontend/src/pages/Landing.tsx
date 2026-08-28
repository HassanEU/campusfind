import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, ClipboardList, Github, PackageSearch, QrCode, ScanLine,
  ShieldCheck, Sparkles, Database, Lock,
} from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/primitives';
import { usePublicStats } from '@/hooks/queries';
import { formatDate } from '@/lib/utils';

/* --------------------------------------------------------------------------
 * Motion presets: short, eased, and skipped entirely for anyone who has asked
 * their system to reduce motion.
 * ------------------------------------------------------------------------ */
const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Report',
    body: 'Describe what you lost — the category, the colour, where you last had it and the detail only you would know.',
  },
  {
    icon: PackageSearch,
    title: 'Match',
    body: 'Every item handed in is scored against your report out of 100, and you see exactly which criteria earned the points.',
  },
  {
    icon: QrCode,
    title: 'Verify',
    body: 'Desk staff scan the label on the item, check your identifying detail, and record the outcome.',
  },
  {
    icon: ShieldCheck,
    title: 'Return',
    body: 'Approval runs as a single database transaction, so the handover and its audit trail are written together or not at all.',
  },
];

export default function Landing() {
  const { data, isLoading } = usePublicStats();
  const reduceMotion = useReducedMotion();
  const stats = data?.stats;

  const motionProps = reduceMotion
    ? {}
    : { variants: stagger, initial: 'hidden' as const, animate: 'show' as const };

  return (
    <div className="min-h-dvh bg-background">
      {/* ------------------------------- header ------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-5">
          <Logo />
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/signin">Sign in</Link>
            </Button>
            <Button asChild variant="primary" size="sm">
              <Link to="/signup">
                <span className="sm:hidden">Join</span>
                <span className="hidden sm:inline">Create account</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* -------------------------------- hero ------------------------------- */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="grid-backdrop absolute inset-0" aria-hidden />

        <motion.div
          {...motionProps}
          className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-5 sm:pt-24"
        >
          <motion.div variants={reduceMotion ? undefined : rise}>
            <Badge tone="primary" className="mb-5">
              <Sparkles className="size-3" />
              Now serving the whole campus
            </Badge>
          </motion.div>

          <motion.h1
            variants={reduceMotion ? undefined : rise}
            className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
          >
            Lost something on campus?
          </motion.h1>

          <motion.p
            variants={reduceMotion ? undefined : rise}
            className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            CampusFind connects what students lose with what gets handed in at the desk. Describe
            your item once, and every new arrival is scored against it automatically — so you find
            out it turned up before you think to ask.
          </motion.p>

          <motion.div
            variants={reduceMotion ? undefined : rise}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Button asChild variant="primary" size="lg">
              <Link to="/signup">
                Report a lost item
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/signin">Browse found items</Link>
            </Button>
          </motion.div>

          {/* Live counters, straight from PostgreSQL. */}
          <motion.dl
            variants={reduceMotion ? undefined : rise}
            className="mt-14 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4"
          >
            {[
              { label: 'Reports filed', value: stats ? stats.totalLost + stats.totalFound : null },
              { label: 'Items in storage', value: stats?.availableFound ?? null },
              { label: 'Back with owners', value: stats?.returnedItems ?? null },
              { label: 'Return rate', value: stats ? `${stats.resolutionRate}%` : null },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight tabular">
                  {isLoading ? <span className="skeleton block h-7 w-12" /> : (stat.value ?? '—')}
                </dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      </section>

      {/* ------------------------------ workflow ----------------------------- */}
      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-xl">
            <p className="text-2xs font-semibold uppercase tracking-wider text-primary">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Four steps, and a record of every one
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Nothing about a lost item should be a mystery. Each stage writes to the database, so
              you can always see where your report stands and who did what.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <motion.li
                key={step.title}
                initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card className="relative h-full p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-md bg-primary-subtle text-primary">
                      <step.icon className="size-4" />
                    </span>
                    <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground tabular">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-3.5 text-base font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </Card>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------- matching explainer ------------------------ */}
      <section className="border-b border-border bg-surface-muted/40 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-primary">
              Explainable matching
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              A score you can actually argue with
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              There is no black box here. Six criteria, fixed weights, one hundred points. The same
              two reports always produce the same number, and the reasons are printed alongside it —
              which matters when the outcome decides who walks away with someone&apos;s property.
            </p>

            <ul className="mt-6 space-y-2.5">
              {[
                ['Category', 20],
                ['Brand', 20],
                ['Location', 20],
                ['Time proximity', 15],
                ['Description similarity', 15],
                ['Colour', 10],
              ].map(([label, weight]) => (
                <li key={label as string} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 text-sm text-muted-foreground">{label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${((weight as number) / 20) * 100}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-sm font-medium tabular">
                    {weight}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* An illustrative match card using the product's real vocabulary. */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-surface-muted/60 px-5 py-3">
              <span className="text-sm font-medium">Potential match</span>
              <Badge tone="success">92 / 100</Badge>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="p-5">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  You reported
                </p>
                <p className="mt-2 text-sm font-medium">Black AirPods Pro</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Scratch on the charging case · Central Library · 3 Oct
                </p>
              </div>
              <div className="p-5">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Handed in
                </p>
                <p className="mt-2 text-sm font-medium">Apple AirPods Pro case</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Library issue counter · 4 Oct · Locker A-04
                </p>
              </div>
            </div>

            <ul className="space-y-2 border-t border-border px-5 py-4">
              {[
                'Both reports are in the Electronics category',
                'Brand matches exactly (Apple)',
                'Lost and found at the same location',
                'Handed in within 1 day of going missing',
              ].map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" aria-hidden />
                  {reason}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* --------------------------- recently handed in ----------------------- */}
      {data?.recentFound?.length ? (
        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">Recently handed in</h2>
                <p className="mt-2 text-base text-muted-foreground">
                  Everything below is sitting at the desk right now, waiting to be collected.
                </p>
              </div>
              <Button asChild variant="secondary">
                <Link to="/signin">
                  See everything
                  <ArrowRight />
                </Link>
              </Button>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.recentFound.map((item, i) => (
                <li key={`${item.itemName}-${i}`}>
                  <Card className="flex h-full flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{item.itemName}</p>
                      <Badge>{item.categoryName}</Badge>
                    </div>
                    <p className="mt-auto pt-3 text-xs text-muted-foreground">
                      {item.locationName} · {formatDate(item.foundDate)}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* --------------------------------- trust ------------------------------ */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Lock,
                title: 'A QR label reveals nothing',
                body: 'The code on an item is an opaque identifier. Scanning one tells you nothing about who lost it — the details only appear for signed-in desk staff.',
              },
              {
                icon: ScanLine,
                title: 'Verified before it is handed over',
                body: 'Staff confirm the physical item against the label and the claimant against their proof. A claim cannot be approved until that check has passed.',
              },
              {
                icon: Database,
                title: 'Every action is on the record',
                body: 'Reports, matches, claims, verifications and returns each write an audit entry with a timestamp and an actor. Nothing happens quietly.',
              },
            ].map((item) => (
              <Card key={item.title} className="p-5">
                <span className="flex size-8 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
                  <item.icon className="size-4" />
                </span>
                <h3 className="mt-3.5 text-base font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </Card>
            ))}
          </div>

          <Card className="mt-4 flex flex-col items-start gap-5 border-primary/20 bg-primary-subtle/50 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Something already missing?
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                File the report now. If it has already been handed in, you will know in seconds.
              </p>
            </div>
            <Button asChild variant="primary" size="lg" className="shrink-0">
              <Link to="/signup">
                Get started
                <ArrowRight />
              </Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* -------------------------------- footer ------------------------------ */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-xs text-muted-foreground">
              Intelligent campus lost &amp; found
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Github className="size-3.5" />
            A database systems project · PostgreSQL · Express · React
          </p>
        </div>
      </footer>
    </div>
  );
}
