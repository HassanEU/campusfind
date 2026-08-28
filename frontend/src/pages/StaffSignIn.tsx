import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, QrCode, ShieldCheck, ScanLine } from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

export default function StaffSignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
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
      const user = await signIn(email, password, 'staff');
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}`);
      const dest =
        redirectTo &&
        redirectTo.startsWith('/staff') &&
        !redirectTo.startsWith('/staff/signin') &&
        !redirectTo.startsWith('/staff/forgot-password')
          ? redirectTo
          : '/staff';
      navigate(dest, { replace: true });
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
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[hsl(226_45%_10%)] px-12 text-white lg:flex lg:flex-col lg:justify-between lg:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 20% 0%, hsl(234 82% 58% / 0.45), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 80%, hsl(190 90% 44% / 0.18), transparent 50%)',
          }}
          aria-hidden
        />
        <div className="relative">
          <Link to="/" className="inline-flex rounded-md text-white">
            <Logo />
          </Link>
        </div>
        <div className="relative max-w-md pb-8">
          <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-white/60">Authorized access</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">The desk, in one place.</h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Review claims, verify ownership with a QR scan, and mark items returned — with every action on the record.
          </p>
          <ul className="mt-10 space-y-4">
            {[
              { icon: ShieldCheck, label: 'Claim review and verification notes' },
              { icon: QrCode, label: 'QR labels that only staff can resolve' },
              { icon: ScanLine, label: 'Handover recorded in a single transaction' },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
                  <item.icon className="size-4" />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-2xs text-white/40">CampusFind Staff Portal</p>
      </aside>

      <div className="flex flex-col bg-background px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="rounded-md lg:hidden">
            <Logo />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/signin">Student login</Link>
          </Button>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <p className="text-2xs font-semibold uppercase tracking-wider text-primary">CampusFind</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2rem]">Staff Portal</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Sign in with your desk account to verify claims and return items.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
            {formError ? (
              <div
                role="alert"
                className="rounded-2xl border border-danger/25 bg-danger-subtle px-3.5 py-2.5 text-sm text-danger"
              >
                {formError}
                {formError.includes('student login') ? (
                  <Link to="/signin" className="mt-1.5 block font-medium underline-offset-4 hover:underline">
                    Go to Student Login
                  </Link>
                ) : null}
              </div>
            ) : null}

            <Field label="Staff email" htmlFor="email" required error={fieldErrors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@campusfind.edu"
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Password" htmlFor="password" required error={fieldErrors.password}>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <div className="-mt-1 flex justify-end">
              <Link
                to="/staff/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" className="w-full" size="lg" loading={submitting}>
              {submitting ? 'Signing in' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            Staff accounts are issued by the project owner. There is no public staff signup.
          </p>
        </div>
      </div>
    </div>
  );
}
