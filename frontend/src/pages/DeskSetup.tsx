import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { ApiError, apiRequest, tokenStore } from '@/lib/api';
import { homeFor } from '@/lib/roles';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';

/**
 * Hidden owner-only page for creating the first STAFF account.
 * Not linked from public navigation. Requires STAFF_SETUP_SECRET on the API.
 */
export default function DeskSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = React.useState({
    fullName: '',
    email: '',
    password: '',
    setupSecret: '',
  });
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (user) navigate(homeFor(user.role), { replace: true });
  }, [user, navigate]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const result = await apiRequest<{ user: User; token: string }>('/auth/staff-setup', {
        method: 'POST',
        body: {
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          setupSecret: form.setupSecret,
        },
      });
      tokenStore.set(result.token);
      toast.success(`Staff account ready. Welcome, ${result.user.fullName.split(' ')[0]}.`);
      window.location.assign('/staff');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          setFormError('Staff setup is disabled on this server. Set STAFF_SETUP_SECRET to enable it.');
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh">
      <div className="flex items-center justify-between px-5 py-6 sm:px-10">
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

      <div className="mx-auto w-full max-w-md px-5 pb-16">
        <span className="inline-flex items-center gap-2 text-primary">
          <ShieldCheck className="size-4" />
          <span className="text-2xs font-semibold uppercase tracking-wider">Owner setup</span>
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create a desk staff account</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This page is not listed in the product. It only works when the project owner has set a setup key on the server.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
          {formError ? (
            <div
              role="alert"
              className="rounded-2xl border border-danger/25 bg-danger-subtle px-3.5 py-2.5 text-sm text-danger"
            >
              {formError}
            </div>
          ) : null}

          <Field label="Full name" htmlFor="fullName" required>
            <Input value={form.fullName} onChange={set('fullName')} required autoComplete="name" />
          </Field>
          <Field label="Email" htmlFor="email" required>
            <Input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
          </Field>
          <Field label="Password" htmlFor="password" required hint="Same rules as student signup (8+ chars, mixed case, a number).">
            <Input type="password" value={form.password} onChange={set('password')} required autoComplete="new-password" />
          </Field>
          <Field label="Setup key" htmlFor="setupSecret" required hint="The STAFF_SETUP_SECRET from your server environment.">
            <Input
              type="password"
              value={form.setupSecret}
              onChange={set('setupSecret')}
              required
              autoComplete="off"
            />
          </Field>

          <Button type="submit" variant="primary" className="w-full" size="lg" loading={submitting}>
            {submitting ? 'Creating staff account' : 'Create staff account'}
          </Button>
        </form>
      </div>
    </div>
  );
}
