import * as React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Info, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, PageHeader } from '@/components/ui/primitives';
import { useCategories, useCreateLostItem, useLocations } from '@/hooks/queries';
import { ApiError } from '@/lib/api';

const today = new Date().toISOString().slice(0, 10);

interface FormState {
  itemName: string;
  categoryId: string;
  locationId: string;
  brand: string;
  color: string;
  description: string;
  identifyingDetails: string;
  lostDate: string;
  lostTimeApprox: string;
}

const initialState: FormState = {
  itemName: '',
  categoryId: '',
  locationId: '',
  brand: '',
  color: '',
  description: '',
  identifyingDetails: '',
  lostDate: today,
  lostTimeApprox: '',
};

/**
 * Client-side validation mirrors the API's zod schema. The server is still the
 * authority — this only saves the user a round trip.
 */
function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.itemName.trim().length < 2) errors.itemName = 'Give the item a short name.';
  if (!form.categoryId) errors.categoryId = 'Choose the closest category.';
  if (!form.locationId) errors.locationId = 'Where did you last have it?';
  if (form.description.trim().length < 15) {
    errors.description = 'Add a little more detail — at least 15 characters.';
  }
  if (!form.lostDate) errors.lostDate = 'Pick the date you lost it.';
  else if (form.lostDate > today) errors.lostDate = 'The date cannot be in the future.';

  return errors;
}

export default function ReportLost() {
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const createLostItem = useCreateLostItem();

  const [form, setForm] = React.useState<FormState>(initialState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState<{ id: number; matches: number } | null>(null);

  const set = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear a field's error the moment the user starts correcting it.
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      // Move focus to the first problem so keyboard users are not stranded.
      document.getElementById(Object.keys(validationErrors)[0]!)?.focus();
      return;
    }

    try {
      const result = await createLostItem.mutateAsync({
        itemName: form.itemName.trim(),
        categoryId: Number(form.categoryId),
        locationId: Number(form.locationId),
        brand: form.brand.trim() || undefined,
        color: form.color.trim() || undefined,
        description: form.description.trim(),
        identifyingDetails: form.identifyingDetails.trim() || undefined,
        lostDate: form.lostDate,
        lostTimeApprox: form.lostTimeApprox || undefined,
      });

      setSubmitted({ id: result.item.lostItemId, matches: result.matchesGenerated });
      toast.success('Report filed', {
        description: result.matchesGenerated
          ? `We already found ${result.matchesGenerated} possible ${result.matchesGenerated === 1 ? 'match' : 'matches'}.`
          : 'We will let you know the moment something similar is handed in.',
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) setErrors(error.fields);
        toast.error('Could not file your report', { description: error.message });
      } else {
        toast.error('Could not file your report', { description: 'Please try again.' });
      }
    }
  }

  /* ------------------------------ success view ---------------------------- */
  if (submitted) {
    return (
      <div className="page max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="p-8 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-subtle text-success">
              <CheckCircle2 className="size-6" />
            </span>

            <h1 className="mt-4 text-xl font-semibold tracking-tight">Your report is filed</h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {submitted.matches > 0 ? (
                <>
                  We compared it against everything currently at the desk and found{' '}
                  <span className="font-medium text-foreground">
                    {submitted.matches} possible {submitted.matches === 1 ? 'match' : 'matches'}
                  </span>
                  . Have a look before anything else.
                </>
              ) : (
                <>
                  Nothing at the desk matches it right now. Every new item handed in will be scored
                  against your report automatically, and we will notify you if something fits.
                </>
              )}
            </p>

            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              {submitted.matches > 0 ? (
                <Button asChild variant="primary">
                  <Link to="/app/matches">
                    <Sparkles />
                    Review matches
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="secondary">
                <Link to={`/app/reports/${submitted.id}`}>
                  View my report
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setForm(initialState);
                  setSubmitted(null);
                }}
              >
                Report another item
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  /* --------------------------------- form --------------------------------- */
  return (
    <div className="page max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/app">
          <ArrowLeft />
          Dashboard
        </Link>
      </Button>

      <PageHeader
        title="Report a lost item"
        description="The more specific you are, the better the matching engine can work. The identifying detail is what proves the item is yours."
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>What did you lose?</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <Field label="Item name" htmlFor="itemName" required error={errors.itemName}>
              <Input
                value={form.itemName}
                onChange={(e) => set('itemName')(e.target.value)}
                placeholder="e.g. Black AirPods Pro"
                maxLength={120}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="categoryId" required error={errors.categoryId}>
                <Select value={form.categoryId} onValueChange={set('categoryId')}>
                  <SelectTrigger id="categoryId" aria-invalid={!!errors.categoryId}>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Where did you last have it?"
                htmlFor="locationId"
                required
                error={errors.locationId}
              >
                <Select value={form.locationId} onValueChange={set('locationId')}>
                  <SelectTrigger id="locationId" aria-invalid={!!errors.locationId}>
                    <SelectValue placeholder="Choose a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.locationId} value={String(l.locationId)}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand" htmlFor="brand" hint="Optional, but worth 20 points if it matches">
                <Input
                  value={form.brand}
                  onChange={(e) => set('brand')(e.target.value)}
                  placeholder="e.g. Apple"
                  maxLength={60}
                />
              </Field>

              <Field label="Colour" htmlFor="color" hint="Optional">
                <Input
                  value={form.color}
                  onChange={(e) => set('color')(e.target.value)}
                  placeholder="e.g. Black"
                  maxLength={40}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>When and where</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 pt-2 sm:grid-cols-2">
            <Field label="Date lost" htmlFor="lostDate" required error={errors.lostDate}>
              <Input
                type="date"
                value={form.lostDate}
                max={today}
                onChange={(e) => set('lostDate')(e.target.value)}
              />
            </Field>

            <Field
              label="Approximate time"
              htmlFor="lostTimeApprox"
              hint="Optional — helps narrow it down"
            >
              <Input
                type="time"
                value={form.lostTimeApprox}
                onChange={(e) => set('lostTimeApprox')(e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Describe it</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <Field
              label="Description"
              htmlFor="description"
              required
              error={errors.description}
              hint={`${form.description.trim().length} / 15 characters minimum`}
            >
              <Textarea
                value={form.description}
                onChange={(e) => set('description')(e.target.value)}
                placeholder="Black Apple AirPods Pro in a silicone case, left on a reading table on the ground floor."
                maxLength={2000}
                rows={4}
              />
            </Field>

            <Field
              label="Identifying detail"
              htmlFor="identifyingDetails"
              hint="Something only the owner would know. Staff use this to confirm the item is really yours — it is never shown to anyone else."
            >
              <Textarea
                value={form.identifyingDetails}
                onChange={(e) => set('identifyingDetails')(e.target.value)}
                placeholder="There is a deep scratch on the front of the charging case, near the status light."
                maxLength={1000}
                rows={3}
              />
            </Field>

            <div className="flex gap-2.5 rounded-md border border-info/25 bg-info-subtle p-3">
              <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
              <p className="text-xs leading-relaxed text-info">
                As soon as you submit, your report is scored against every item currently at the
                desk. Anything that clears 40 out of 100 will show up in your matches.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="secondary" type="button">
            <Link to="/app">Cancel</Link>
          </Button>
          <Button type="submit" variant="primary" loading={createLostItem.isPending}>
            {createLostItem.isPending ? 'Filing report' : 'File report'}
          </Button>
        </div>
      </form>
    </div>
  );
}
