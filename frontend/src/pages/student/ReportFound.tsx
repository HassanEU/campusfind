import * as React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Download, Info, Printer, QrCode } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, PageHeader } from '@/components/ui/primitives';
import { useCategories, useCreateFoundItem, useLocations } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

const today = new Date().toISOString().slice(0, 10);

interface FormState {
  itemName: string;
  categoryId: string;
  locationId: string;
  brand: string;
  color: string;
  description: string;
  storageLocation: string;
  foundDate: string;
  foundTimeApprox: string;
}

const initialState: FormState = {
  itemName: '',
  categoryId: '',
  locationId: '',
  brand: '',
  color: '',
  description: '',
  storageLocation: '',
  foundDate: today,
  foundTimeApprox: '',
};

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.itemName.trim().length < 2) errors.itemName = 'Give the item a short name.';
  if (!form.categoryId) errors.categoryId = 'Choose the closest category.';
  if (!form.locationId) errors.locationId = 'Where was it found?';
  if (form.description.trim().length < 15) {
    errors.description = 'Add a little more detail — at least 15 characters.';
  }
  if (!form.foundDate) errors.foundDate = 'Pick the date it was found.';
  else if (form.foundDate > today) errors.foundDate = 'The date cannot be in the future.';
  return errors;
}

export default function ReportFound() {
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const createFoundItem = useCreateFoundItem();

  const [form, setForm] = React.useState<FormState>(initialState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<{
    itemName: string; qrCode: string; dataUrl: string | null; matches: number;
  } | null>(null);

  const isStaff = user?.role !== 'STUDENT';

  const set = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      document.getElementById(Object.keys(validationErrors)[0]!)?.focus();
      return;
    }

    try {
      const response = await createFoundItem.mutateAsync({
        itemName: form.itemName.trim(),
        categoryId: Number(form.categoryId),
        locationId: Number(form.locationId),
        brand: form.brand.trim() || undefined,
        color: form.color.trim() || undefined,
        description: form.description.trim(),
        storageLocation: form.storageLocation.trim() || undefined,
        foundDate: form.foundDate,
        foundTimeApprox: form.foundTimeApprox || undefined,
      });

      setResult({
        itemName: response.item.itemName,
        qrCode: response.item.qrCode ?? '',
        dataUrl: response.qrDataUrl,
        matches: response.matchesGenerated,
      });

      toast.success('Item logged', {
        description: response.matchesGenerated
          ? `Notified ${response.matchesGenerated} student${response.matchesGenerated === 1 ? '' : 's'} with a matching report.`
          : 'No matching reports yet — it will be scored against new ones automatically.',
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) setErrors(error.fields);
        toast.error('Could not log the item', { description: error.message });
      } else {
        toast.error('Could not log the item', { description: 'Please try again.' });
      }
    }
  }

  function printLabel() {
    if (!result?.dataUrl) return;

    const win = window.open('', '_blank', 'width=460,height=620');
    if (!win) {
      toast.error('Your browser blocked the print window', {
        description: 'Allow pop-ups for this site, or download the label instead.',
      });
      return;
    }

    win.document.write(`
      <!doctype html><html><head><title>${result.qrCode}</title>
      <style>
        body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:32px;text-align:center}
        h1{font-size:15px;margin:0 0 4px;letter-spacing:-0.01em}
        p{font-size:12px;color:#555;margin:0 0 20px}
        img{width:260px;height:260px}
        code{display:block;margin-top:14px;font-size:15px;letter-spacing:0.06em;font-weight:600}
        small{display:block;margin-top:18px;font-size:10px;color:#888;max-width:280px;margin-inline:auto;line-height:1.5}
      </style></head><body>
        <h1>CampusFind</h1>
        <p>${result.itemName}</p>
        <img src="${result.dataUrl}" alt="QR code ${result.qrCode}" />
        <code>${result.qrCode}</code>
        <small>Attach this label to the item. Scanning it only reveals the item record to lost &amp; found staff.</small>
        <script>window.onload=function(){window.print()}<\/script>
      </body></html>
    `);
    win.document.close();
  }

  /* ------------------------------ success view ---------------------------- */
  if (result) {
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

            <h1 className="mt-4 text-xl font-semibold tracking-tight">
              Logged, and its label is ready
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {result.matches > 0 ? (
                <>
                  {result.matches} student{result.matches === 1 ? ' has' : 's have'} a report that
                  matches this item — they have been notified.
                </>
              ) : (
                <>
                  No open report matches it yet. It will be scored automatically against every new
                  report from now on.
                </>
              )}
            </p>

            {result.dataUrl ? (
              <div className="mt-6 inline-flex flex-col items-center rounded-lg border border-border bg-surface-muted/40 p-5">
                <img
                  src={result.dataUrl}
                  alt={`QR code for ${result.qrCode}`}
                  className="size-44 rounded-md bg-white p-2"
                />
                <code className="mt-3 font-mono text-sm font-semibold tracking-wider">
                  {result.qrCode}
                </code>
                <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Attach this to the item. The code identifies the record only — it carries no
                  personal information.
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Button variant="primary" onClick={printLabel} disabled={!result.dataUrl}>
                <Printer />
                Print label
              </Button>
              <Button asChild variant="secondary" disabled={!result.dataUrl}>
                <a href={result.dataUrl ?? '#'} download={`${result.qrCode}.png`}>
                  <Download />
                  Download
                </a>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setForm(initialState);
                  setResult(null);
                }}
              >
                Log another item
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
        <Link to={isStaff ? '/staff' : '/app'}>
          <ArrowLeft />
          Back
        </Link>
      </Button>

      <PageHeader
        title="Log a found item"
        description="Record what was handed in. CampusFind issues a printable QR label and immediately checks it against every open report."
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>What was found?</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <Field label="Item name" htmlFor="itemName" required error={errors.itemName}>
              <Input
                value={form.itemName}
                onChange={(e) => set('itemName')(e.target.value)}
                placeholder="e.g. Apple AirPods Pro case"
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

              <Field label="Found at" htmlFor="locationId" required error={errors.locationId}>
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
              <Field label="Brand" htmlFor="brand" hint="Optional">
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
            <CardTitle>When and where it is kept</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date found" htmlFor="foundDate" required error={errors.foundDate}>
                <Input
                  type="date"
                  value={form.foundDate}
                  max={today}
                  onChange={(e) => set('foundDate')(e.target.value)}
                />
              </Field>

              <Field label="Approximate time" htmlFor="foundTimeApprox" hint="Optional">
                <Input
                  type="time"
                  value={form.foundTimeApprox}
                  onChange={(e) => set('foundTimeApprox')(e.target.value)}
                />
              </Field>
            </div>

            <Field
              label="Storage location"
              htmlFor="storageLocation"
              hint="Where the item physically sits. Defaults to the Lost & Found Desk."
            >
              <Input
                value={form.storageLocation}
                onChange={(e) => set('storageLocation')(e.target.value)}
                placeholder="e.g. Desk Locker A-04"
                maxLength={120}
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
                placeholder="Black Apple AirPods Pro with charging case, handed in at the library issue counter."
                maxLength={2000}
                rows={4}
              />
            </Field>

            <div className="flex gap-2.5 rounded-md border border-warning/25 bg-warning-subtle p-3">
              <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <p className="text-xs leading-relaxed text-warning">
                Describe the item, but leave out anything that could act as proof of ownership —
                serial numbers, the contents of a wallet, names inside a book. Those details are how
                the desk confirms the real owner.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="secondary" type="button">
            <Link to={isStaff ? '/staff' : '/app'}>Cancel</Link>
          </Button>
          <Button type="submit" variant="primary" loading={createFoundItem.isPending}>
            <QrCode />
            {createFoundItem.isPending ? 'Logging item' : 'Log item & generate QR'}
          </Button>
        </div>
      </form>
    </div>
  );
}
