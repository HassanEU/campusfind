import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, CheckCircle2, ClipboardList, Lock, PackageSearch, QrCode,
  ScanLine, ShieldCheck, Sparkles,
} from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge, Card, StatusBadge } from '@/components/ui/primitives';
import { usePublicStats } from '@/hooks/queries';
import { formatDate } from '@/lib/utils';

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Report what you lost',
    body: 'Describe the item, where you last had it, and a detail only you would know. That report stays open until it is returned.',
  },
  {
    icon: PackageSearch,
    title: 'CampusFind scores a match',
    body: 'Every item handed in is compared against open reports — category, brand, colour, location, time, and description.',
  },
  {
    icon: ShieldCheck,
    title: 'You submit a claim',
    body: 'If the score looks right, you claim it with your identifying detail. The item is held until the desk reviews.',
  },
  {
    icon: QrCode,
    title: 'Staff verify and return',
    body: 'Desk staff scan the QR label, confirm ownership, approve the claim, and mark the item returned — all in one record.',
  },
];

function ProductMockup({
  recentFound,
}: {
  recentFound?: { itemName: string; categoryName: string; locationName: string; foundDate: string }[];
}) {
  const items = recentFound?.slice(0, 3) ?? [];

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-br from-primary/20 via-transparent to-cyan-400/15 blur-2xl" aria-hidden />

      <div className="relative overflow-hidden rounded-[28px] border border-border/80 bg-surface/90 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-border/80 px-4 py-3">
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="ml-2 truncate text-2xs font-medium text-muted-foreground">
            campusfind · lost &amp; found
          </span>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-2.5">
            <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Found on campus
            </p>
            {items.length ? (
              items.map((item) => (
                <div key={item.itemName} className="rounded-2xl border border-border/80 bg-surface-muted/50 px-3.5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.itemName}</p>
                    <Badge>{item.categoryName}</Badge>
                  </div>
                  <p className="mt-1 truncate text-2xs text-muted-foreground">
                    {item.locationName} · {formatDate(item.foundDate)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-3.5 py-8 text-center text-xs text-muted-foreground">
                Live found items appear here from the desk.
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="rounded-2xl border border-primary/20 bg-primary-subtle/60 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-2xs font-semibold uppercase tracking-wider text-primary">Smart match</p>
                <Badge tone="success">92 / 100</Badge>
              </div>
              <p className="mt-2 text-sm font-medium">AirPods Pro case</p>
              <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
                Same category, brand, and library location · handed in the next day
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Claim</p>
                <StatusBadge status="PENDING" />
              </div>
              <p className="mt-2 text-sm font-medium">Awaiting desk review</p>
              <p className="mt-1 text-2xs text-muted-foreground">Scratch on the charging case · locker A-04</p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border/80 p-3.5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-foreground text-[10px] font-semibold tracking-wider text-background">
                QR
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">QR verification</p>
                <p className="truncate font-mono text-2xs text-muted-foreground">CF-FOUND-000125</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 hidden w-44 rounded-2xl border border-border bg-surface p-3 shadow-md sm:block">
        <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Campus activity</p>
        <p className="mt-1.5 text-sm font-medium">3 items returned today</p>
        <p className="mt-0.5 text-2xs text-muted-foreground">Matches scored in PostgreSQL</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const { data, isLoading } = usePublicStats();
  const reduceMotion = useReducedMotion();
  const stats = data?.stats;

  const motionProps = reduceMotion
    ? {}
    : { variants: stagger, initial: 'hidden' as const, animate: 'show' as const };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
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

      <section className="hero-mesh relative overflow-hidden border-b border-border/70">
        <motion.div
          {...motionProps}
          className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:pb-28"
        >
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
              <motion.div variants={reduceMotion ? undefined : rise} className="flex justify-center lg:justify-start">
                <Logo size="lg" className="justify-center" />
              </motion.div>

              <motion.div variants={reduceMotion ? undefined : rise} className="mt-8 flex justify-center lg:justify-start">
                <Badge tone="primary">
                  <Sparkles className="size-3" />
                  Intelligent campus lost &amp; found
                </Badge>
              </motion.div>

              <motion.h1
                variants={reduceMotion ? undefined : rise}
                className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]"
              >
                Lost something on campus? We’ll help you find it.
              </motion.h1>

              <motion.p
                variants={reduceMotion ? undefined : rise}
                className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg"
              >
                Report once. CampusFind scores every item handed in against your description,
                then desk staff verify ownership with a QR scan before anything is returned.
              </motion.p>

              <motion.div
                variants={reduceMotion ? undefined : rise}
                className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"
              >
                <Button asChild variant="primary" size="lg">
                  <Link to="/signup">
                    Report Lost Item
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link to="/signin">Browse Found Items</Link>
                </Button>
              </motion.div>

              <motion.dl
                variants={reduceMotion ? undefined : rise}
                className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4"
              >
                {[
                  { label: 'Reports filed', value: stats ? stats.totalLost + stats.totalFound : null },
                  { label: 'At the desk', value: stats?.availableFound ?? null },
                  { label: 'Returned', value: stats?.returnedItems ?? null },
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
            </div>

            <motion.div variants={reduceMotion ? undefined : rise} className="lg:pt-4">
              <ProductMockup recentFound={data?.recentFound} />
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section id="how-it-works" className="border-b border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-2xs font-semibold uppercase tracking-wider text-primary">How CampusFind Works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              From a missing item to a verified return
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              The same workflow the desk uses every day: report, match, claim, verify, return —
              with every step written to PostgreSQL.
            </p>
          </div>

          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <motion.li
                key={step.title}
                initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card className="relative h-full p-6">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground tabular">
                    0{index + 1}
                  </span>
                  <span className="mt-4 flex size-10 items-center justify-center rounded-2xl bg-primary-subtle text-primary">
                    <step.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </Card>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border bg-surface-muted/40 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-primary">Smart Matching</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              A score you can actually explain
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Six criteria, fixed weights, one hundred points. The same two reports always produce
              the same number — and the reasons sit next to the score.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                ['Category', 20],
                ['Brand', 20],
                ['Location', 20],
                ['Time proximity', 15],
                ['Description similarity', 15],
                ['Colour', 10],
              ].map(([label, weight]) => (
                <li key={label as string} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                      style={{ width: `${((weight as number) / 20) * 100}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-sm font-medium tabular">{weight}</span>
                </li>
              ))}
            </ul>
          </div>

          <Card className="overflow-hidden p-0 shadow-sm">
            <div className="flex items-center justify-between border-b border-border bg-surface-muted/60 px-5 py-3.5">
              <span className="text-sm font-medium">Potential match</span>
              <Badge tone="success">92 / 100</Badge>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="p-5">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">You reported</p>
                <p className="mt-2 text-sm font-medium">Black AirPods Pro</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Scratch on the charging case · Central Library
                </p>
              </div>
              <div className="p-5">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Handed in</p>
                <p className="mt-2 text-sm font-medium">Apple AirPods Pro case</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Library issue counter · Locker A-04
                </p>
              </div>
            </div>
            <ul className="space-y-2.5 border-t border-border px-5 py-4">
              {[
                'Both reports are in Electronics',
                'Brand matches exactly',
                'Lost and found at the same location',
                'Handed in within a day of going missing',
              ].map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                  {reason}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="border-b border-border py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-2xs font-semibold uppercase tracking-wider text-primary">Browse Found Items</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Recently handed in</h2>
              <p className="mt-3 text-base text-muted-foreground">
                Live from the desk — items waiting to be matched and collected.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link to="/signin">
                See everything
                <ArrowRight />
              </Link>
            </Button>
          </div>

          {data?.recentFound?.length ? (
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.recentFound.map((item, i) => (
                <li key={`${item.itemName}-${i}`}>
                  <Card className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{item.itemName}</p>
                      <Badge>{item.categoryName}</Badge>
                    </div>
                    <p className="mt-auto pt-4 text-xs text-muted-foreground">
                      {item.locationName} · {formatDate(item.foundDate)}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Card className="mt-10 p-10 text-center">
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Loading items at the desk…' : 'Nothing is waiting at the desk right now.'}
              </p>
            </Card>
          )}
        </div>
      </section>

      <section className="border-b border-border bg-surface-muted/40 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-primary">QR Verification</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Scan the label. Confirm the owner. Hand it back.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Every found item gets an opaque CampusFind code. Scanning it opens the verification
              screen for signed-in desk staff — never a public lookup of who lost what.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <ScanLine className="mt-0.5 size-4 shrink-0 text-primary" />
                Camera or typed code — same lookup, same record.
              </li>
              <li className="flex gap-2">
                <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
                The printed code reveals nothing until a staff session verifies it.
              </li>
            </ul>
          </div>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-24 items-center justify-center rounded-2xl bg-foreground font-mono text-xs font-semibold tracking-widest text-background">
                CF QR
              </div>
              <div>
                <p className="text-sm font-semibold">CF-FOUND-000125</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Labels encode the current app origin, so localhost is used in development and the
                  live domain is used in production.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-2xs font-semibold uppercase tracking-wider text-primary">Trust &amp; Safety</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Ownership is proven before anything leaves the desk
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Lock,
                title: 'A QR label reveals nothing',
                body: 'The code is an opaque identifier. Details appear only for signed-in desk staff.',
              },
              {
                icon: ScanLine,
                title: 'Verified before handover',
                body: 'Staff confirm the physical item and the claimant. A claim cannot be approved until that check passes.',
              },
              {
                icon: ShieldCheck,
                title: 'Every action is on the record',
                body: 'Reports, matches, claims, verifications and returns each write an audit entry with a timestamp and an actor.',
              },
            ].map((item) => (
              <Card key={item.title} className="p-6">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-surface-muted text-muted-foreground">
                  <item.icon className="size-4" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </Card>
            ))}
          </div>

          <Card className="mt-6 flex flex-col items-start gap-5 border-primary/20 bg-gradient-to-br from-primary-subtle/80 to-surface p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Something already missing?</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                File the report now. If it has already been handed in, you will know as soon as it matches.
              </p>
            </div>
            <Button asChild variant="primary" size="lg" className="shrink-0">
              <Link to="/signup">
                Report Lost Item
                <ArrowRight />
              </Link>
            </Button>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p className="text-xs text-muted-foreground">
            CampusFind · PostgreSQL · real matching, claims, and QR verification
          </p>
        </div>
      </footer>
    </div>
  );
}
