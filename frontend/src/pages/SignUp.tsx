import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Check, X } from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

/** The same rules the API enforces, shown live so nobody guesses. */
const RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
];

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = React.useState({
    fullName: '',
    email: '',
    password: '',
    enrollmentNo: '',
    department: '',
    phone: '',
  });
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [touchedPassword, setTouchedPassword] = React.useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const passwordOk = RULES.every((rule) => rule.test(form.password));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const user = await signUp({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        enrollmentNo: form.enrollmentNo || undefined,
        department: form.department || undefined,
        phone: form.phone || undefined,
      });
      toast.success(`Account created. Welcome, ${user.fullName.split(' ')[0]}.`);
      navigate('/app', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.fields ? 'Please check the highlighted fields.' : error.message);
        if (error.fields) setFieldErrors(error.fields);
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
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Students can report lost items, review matches and claim what belongs to them.
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

          <Field label="Full name" htmlFor="fullName" required error={fieldErrors.fullName}>
            <Input
              value={form.fullName}
              onChange={set('fullName')}
              placeholder="Aarav Sharma"
              autoComplete="name"
              required
            />
          </Field>

          <Field label="College email" htmlFor="email" required error={fieldErrors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@campus.edu"
              autoComplete="email"
              required
            />
          </Field>

          <Field label="Password" htmlFor="password" required error={fieldErrors.password}>
            <Input
              type="password"
              value={form.password}
              onChange={set('password')}
              onBlur={() => setTouchedPassword(true)}
              autoComplete="new-password"
              required
            />
          </Field>

          {/* Requirements appear as soon as the user starts typing, and tick
              off one by one rather than failing all at once on submit. */}
          {form.password || touchedPassword ? (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5" aria-live="polite">
              {RULES.map((rule) => {
                const ok = rule.test(form.password);
                return (
                  <li
                    key={rule.label}
                    className={cn(
                      'flex items-center gap-1.5 text-xs',
                      ok ? 'text-success' : 'text-muted-foreground',
                    )}
                  >
                    {ok ? <Check className="size-3.5" /> : <X className="size-3.5 opacity-50" />}
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Enrollment number"
              htmlFor="enrollmentNo"
              hint="Optional"
              error={fieldErrors.enrollmentNo}
            >
              <Input value={form.enrollmentNo} onChange={set('enrollmentNo')} placeholder="CS21B1042" />
            </Field>

            <Field label="Department" htmlFor="department" hint="Optional" error={fieldErrors.department}>
              <Input value={form.department} onChange={set('department')} placeholder="Computer Science" />
            </Field>
          </div>

          <Field
            label="Phone"
            htmlFor="phone"
            hint="Optional — helps the desk reach you when your item turns up"
            error={fieldErrors.phone}
          >
            <Input value={form.phone} onChange={set('phone')} placeholder="+91 98450 22001" autoComplete="tel" />
          </Field>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={submitting}
            disabled={!passwordOk && form.password.length > 0}
          >
            {submitting ? 'Creating account' : 'Create account'}
          </Button>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Staff and administrator accounts are created by an existing administrator, not through
            this form.
          </p>
        </form>

        <p className="mt-5 text-sm text-muted-foreground">
          Already registered?{' '}
          <Link to="/signin" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
