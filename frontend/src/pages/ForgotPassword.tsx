import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';

export default function ForgotPassword({ portal }: { portal: 'student' | 'staff' }) {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const signInTo = portal === 'staff' ? '/staff/signin' : '/signin';
  const isStaff = portal === 'staff';

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-dvh">
      <div className="hero-mesh absolute inset-x-0 top-0 h-72" aria-hidden />
      <div className="relative flex items-center justify-between px-5 py-6 sm:px-10">
        <Link to="/" className="rounded-md">
          <Logo />
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link to={signInTo}>
            <ArrowLeft />
            Back to sign in
          </Link>
        </Button>
      </div>

      <div className="relative mx-auto w-full max-w-[400px] px-5 pb-16 pt-6">
        <p className="text-2xs font-semibold uppercase tracking-wider text-primary">
          {isStaff ? 'Staff Portal' : 'Student Login'}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Forgot password</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {isStaff
            ? 'Desk passwords are reset by the project owner. Enter the email on your staff account and we will tell you how to proceed.'
            : 'Enter the email on your CampusFind account. The lost & found desk can restore access after checking your campus ID.'}
        </p>

        {submitted ? (
          <div className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-xs">
            <CheckCircle2 className="size-5 text-success" />
            <p className="mt-3 text-sm font-semibold">Request received</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {isStaff
                ? 'Visit the project owner or an existing desk supervisor with your staff ID. Passwords are never reset from this page automatically.'
                : 'Visit the lost & found desk with your campus ID. They can confirm your account and help you sign in again.'}
            </p>
            <Button asChild variant="primary" className="mt-5 w-full">
              <Link to={signInTo}>Return to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
            <Field label={isStaff ? 'Staff email' : 'Email'} htmlFor="email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isStaff ? 'you@campusfind.edu' : 'you@campus.edu'}
                autoComplete="email"
                required
              />
            </Field>
            <Button type="submit" variant="primary" className="w-full" size="lg">
              Continue
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
