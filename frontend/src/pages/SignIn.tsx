import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound } from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Card } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

/** Handy during a demo: one click fills the form for each role. */
const DEMO_ACCOUNTS = [
  { role: 'Student', email: 'aarav@campus.edu', note: 'has an open match waiting' },
  { role: 'Desk staff', email: 'rahul.desai@campusfind.edu', note: 'reviews and returns items' },
  { role: 'Admin', email: 'admin@campusfind.edu', note: 'analytics and user management' },
];

export default function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const user = await signIn(email, password);
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}`);
      const home = user.role === 'ADMIN' ? '/admin' : user.role === 'STAFF' ? '/staff' : '/app';
      navigate(redirectTo ?? home, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        if (error.fields) setFieldErrors(error.fields);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      {/* form column */}
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="rounded-md">
            <Logo />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft />
              Back
            </Link>
          </Button>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Access your reports, matches and claims.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
            {formError ? (
              <div
                role="alert"
                className="rounded-md border border-danger/25 bg-danger-subtle px-3 py-2.5 text-sm text-danger"
              >
                {formError}
              </div>
            ) : null}

            <Field label="Email" htmlFor="email" required error={fieldErrors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@campus.edu"
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Password" htmlFor="password" required error={fieldErrors.password}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
            </Field>

            <Button type="submit" variant="primary" className="w-full" loading={submitting}>
              {submitting ? 'Signing in' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-5 text-sm text-muted-foreground">
            New to CampusFind?{' '}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* demo column */}
      <aside className="hidden flex-col justify-center border-l border-border bg-surface-muted/50 px-10 lg:flex">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-2 text-primary">
            <KeyRound className="size-4" />
            <p className="text-2xs font-semibold uppercase tracking-wider">Demo accounts</p>
          </div>

          <h2 className="mt-3 text-xl font-semibold tracking-tight">
            Try any role without signing up
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            These accounts ship with the seeded database. Every one uses the password{' '}
            <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">Campus@123</code>.
          </p>

          <ul className="mt-6 space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <Card className="p-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword('Campus@123');
                      setFormError(null);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{account.role}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {account.email}
                      </span>
                    </span>
                    <span className="shrink-0 text-2xs text-muted-foreground">{account.note}</span>
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
