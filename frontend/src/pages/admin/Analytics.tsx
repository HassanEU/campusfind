import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  CheckCircle2, ClipboardList, PackageSearch, Percent, ShieldCheck, Users,
} from 'lucide-react';

import {
  Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorState, PageHeader,
} from '@/components/ui/primitives';
import { Stat } from '@/components/ui/data';
import { useAnalytics } from '@/hooks/queries';
import { formatDate } from '@/lib/utils';

/** Chart colours are read from the theme so charts follow light/dark mode. */
const COLORS = {
  lost: 'hsl(var(--primary))',
  found: 'hsl(var(--info))',
  returned: 'hsl(var(--success))',
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))',
};

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2 shadow-popover">
      <p className="text-xs font-medium">{label}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminAnalytics() {
  const { data, isLoading, isError, refetch } = useAnalytics();
  const stats = data?.stats;

  if (isError) {
    return (
      <div className="page">
        <ErrorState title="We could not load the analytics" onRetry={() => void refetch()} />
      </div>
    );
  }

  const timeSeries =
    data?.reportsOverTime.map((row) => ({
      day: formatDate(row.day, 'd MMM'),
      Lost: row.lostCount,
      Found: row.foundCount,
      Returned: row.returnedCount,
    })) ?? [];

  const categoryData =
    data?.byCategory
      .filter((c) => c.lostCount + c.foundCount > 0)
      .map((c) => ({ name: c.categoryName, Lost: c.lostCount, Found: c.foundCount })) ?? [];

  const locationData =
    data?.byLocation
      .filter((l) => l.totalReports > 0)
      .slice(0, 7)
      .map((l) => ({ name: l.locationName, Reports: l.totalReports })) ?? [];

  const qualityData = data?.matchQuality.map((q) => ({ name: q.bucket, Matches: q.matchCount })) ?? [];
  const QUALITY_COLORS = ['hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))'];

  return (
    <div className="page">
      <PageHeader
        title="Campus analytics"
        description="Every figure below is computed in PostgreSQL at request time — nothing on this page is precomputed or hard-coded."
      />

      {/* ------------------------------- counters ---------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Lost reports" value={stats?.totalLost ?? 0} icon={ClipboardList} loading={isLoading} />
        <Stat label="Items handed in" value={stats?.totalFound ?? 0} icon={PackageSearch} loading={isLoading} />
        <Stat
          label="Open matches"
          value={stats?.potentialMatches ?? 0}
          icon={PackageSearch}
          tone="primary"
          loading={isLoading}
        />
        <Stat
          label="Pending claims"
          value={stats?.pendingClaims ?? 0}
          icon={ShieldCheck}
          tone={stats?.pendingClaims ? 'warning' : 'neutral'}
          loading={isLoading}
        />
        <Stat
          label="Items returned"
          value={stats?.returnedItems ?? 0}
          icon={CheckCircle2}
          tone="success"
          loading={isLoading}
        />
        <Stat
          label="Resolution rate"
          value={stats ? `${stats.resolutionRate}%` : '—'}
          hint="Returned ÷ handed in"
          icon={Percent}
          tone="success"
          loading={isLoading}
        />
      </div>

      {/* ----------------------------- reports chart -------------------------- */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Reports over the last 30 days</CardTitle>
          <p className="text-sm text-muted-foreground">
            Days with no activity are included, so the shape of the line is honest.
          </p>
        </CardHeader>

        <CardContent className="pt-2">
          {isLoading ? (
            <div className="skeleton h-64" />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lostFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.lost} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={COLORS.lost} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="foundFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.found} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={COLORS.found} stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: COLORS.axis }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: COLORS.axis }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={40}
                  />
                  <Tooltip content={<ChartTooltip />} />

                  <Area
                    type="monotone" dataKey="Lost" stroke={COLORS.lost}
                    fill="url(#lostFill)" strokeWidth={2}
                  />
                  <Area
                    type="monotone" dataKey="Found" stroke={COLORS.found}
                    fill="url(#foundFill)" strokeWidth={2}
                  />
                  <Area
                    type="monotone" dataKey="Returned" stroke={COLORS.returned}
                    fill="transparent" strokeWidth={2} strokeDasharray="4 3"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <ul className="mt-3 flex flex-wrap gap-4">
            {[
              ['Lost reports', COLORS.lost],
              ['Items handed in', COLORS.found],
              ['Returned', COLORS.returned],
            ].map(([label, color]) => (
              <li key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* ---------------------------- by category --------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>What goes missing</CardTitle>
            <p className="text-sm text-muted-foreground">Reports by category, lost against found.</p>
          </CardHeader>

          <CardContent className="pt-2">
            {isLoading ? (
              <div className="skeleton h-64" />
            ) : categoryData.length ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name" tick={{ fontSize: 10, fill: COLORS.axis }}
                      tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={50}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: COLORS.axis }} tickLine={false}
                      axisLine={false} allowDecimals={false} width={40}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="Lost" fill={COLORS.lost} radius={[3, 3, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="Found" fill={COLORS.found} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="No reports yet" description="Charts appear once reports are filed." />
            )}
          </CardContent>
        </Card>

        {/* --------------------------- match quality -------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>How confident are the matches?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribution of every score the engine has produced.
            </p>
          </CardHeader>

          <CardContent className="pt-2">
            {isLoading ? (
              <div className="skeleton h-64" />
            ) : qualityData.length ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={qualityData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number" tick={{ fontSize: 11, fill: COLORS.axis }}
                      tickLine={false} axisLine={false} allowDecimals={false}
                    />
                    <YAxis
                      type="category" dataKey="name" width={70}
                      tick={{ fontSize: 11, fill: COLORS.axis }} tickLine={false} axisLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="Matches" radius={[0, 3, 3, 0]} maxBarSize={26}>
                      {qualityData.map((_, index) => (
                        <Cell key={index} fill={QUALITY_COLORS[index] ?? COLORS.axis} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="No matches yet" description="The engine has not scored any pairs." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* ----------------------------- hotspots ----------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>Where things go missing</CardTitle>
            <p className="text-sm text-muted-foreground">
              Busiest locations by total reports — useful for deciding where to put a drop box.
            </p>
          </CardHeader>

          <CardContent className="pt-2">
            {isLoading ? (
              <div className="skeleton h-56" />
            ) : locationData.length ? (
              <ul className="space-y-3">
                {locationData.map((row) => {
                  const max = Math.max(...locationData.map((l) => l.Reports));
                  return (
                    <li key={row.name}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm">{row.name}</span>
                        <span className="shrink-0 text-xs font-medium tabular">{row.Reports}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(row.Reports / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="No location data yet" />
            )}
          </CardContent>
        </Card>

        {/* -------------------------- resolution table ------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle>Which categories come back</CardTitle>
            <p className="text-sm text-muted-foreground">
              Only categories that have had at least one report are listed.
            </p>
          </CardHeader>

          <CardContent className="pt-2">
            {isLoading ? (
              <div className="skeleton h-56" />
            ) : data?.topCategories.length ? (
              <ul className="divide-y divide-border">
                {data.topCategories.map((row) => (
                  <li key={row.categoryName} className="flex items-center gap-3 py-2.5 first:pt-0">
                    <span className="min-w-0 flex-1 truncate text-sm">{row.categoryName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular">
                      {row.resolvedCount} / {row.lostCount} resolved
                    </span>
                    <span
                      className={`w-12 shrink-0 text-right text-xs font-semibold tabular ${
                        row.resolvedRate >= 50 ? 'text-success' : 'text-muted-foreground'
                      }`}
                    >
                      {row.resolvedRate}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No category data yet" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-2.5">
            <Users className="size-4 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">Registered users</p>
              <p className="text-lg font-semibold tabular">{stats?.registeredUsers ?? '—'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Confirmed matches</p>
            <p className="text-lg font-semibold tabular">{stats?.confirmedMatches ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Still on the shelf</p>
            <p className="text-lg font-semibold tabular">{stats?.availableFound ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Open lost reports</p>
            <p className="text-lg font-semibold tabular">{stats?.activeLost ?? '—'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
