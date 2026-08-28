import { Link } from 'react-router-dom';
import { Mail, Phone, GraduationCap, Building2, PackageCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Separator,
} from '@/components/ui/primitives';
import { useReturns } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, initials, pluralize } from '@/lib/utils';

export default function Profile() {
  const { user } = useAuth();
  const { data: returns, isLoading } = useReturns();

  if (!user) return null;

  const roleLabel = { STUDENT: 'Student', STAFF: 'Desk staff', ADMIN: 'Administrator' }[user.role];

  const details = [
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Phone, label: 'Phone', value: user.phone },
    { icon: GraduationCap, label: 'Enrollment number', value: user.enrollmentNo },
    { icon: Building2, label: 'Department', value: user.department },
  ].filter((detail) => Boolean(detail.value));

  return (
    <div className="page max-w-3xl">
      <PageHeader title="Profile" description="Your account and everything you have collected." />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {initials(user.fullName)}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight">{user.fullName}</p>
            <Badge tone="primary" className="mt-1.5">
              {roleLabel}
            </Badge>
          </div>
        </CardContent>

        <Separator />

        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            {details.map((detail) => (
              <div key={detail.label} className="flex items-start gap-2.5">
                <detail.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{detail.label}</dt>
                  <dd className="truncate text-sm font-medium">{detail.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Items returned to you</CardTitle>
          <p className="text-sm text-muted-foreground">
            {returns?.length
              ? `${pluralize(returns.length, 'item')} collected from the lost & found desk.`
              : 'Anything the desk hands back to you appears here.'}
          </p>
        </CardHeader>

        <CardContent className="pt-2">
          {isLoading ? (
            <div className="skeleton h-16" />
          ) : returns?.length ? (
            <ul className="divide-y divide-border">
              {returns.map((record) => (
                <li key={record.returnId} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{record.itemName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {record.categoryName} · found at {record.foundLocation} · released by{' '}
                      {record.releasedByName}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground tabular">
                    {formatDate(record.returnedAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={PackageCheck}
              title="Nothing collected yet"
              description="Once a claim is approved and you pick the item up, it will be listed here."
              action={
                <Button asChild variant="secondary" size="sm">
                  <Link to="/app/matches">Review my matches</Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
