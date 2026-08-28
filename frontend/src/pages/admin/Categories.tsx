import * as React from 'react';
import { toast } from 'sonner';
import { Plus, Tags } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui/primitives';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/form';
import { useCategories, useSaveCategory } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import type { Category } from '@/types';

export default function AdminCategories() {
  const { data: categories = [], isLoading } = useCategories();
  const save = useSaveCategory();

  const [editing, setEditing] = React.useState<Category | 'new' | null>(null);
  const [form, setForm] = React.useState({ name: '', description: '' });
  const [error, setError] = React.useState<string | null>(null);

  function open(target: Category | 'new') {
    setEditing(target);
    setError(null);
    setForm(
      target === 'new'
        ? { name: '', description: '' }
        : { name: target.name, description: target.description ?? '' },
    );
  }

  async function handleSave() {
    if (form.name.trim().length < 2) {
      setError('Give the category a name of at least two characters.');
      return;
    }

    try {
      await save.mutateAsync({
        id: editing === 'new' || editing === null ? undefined : editing.categoryId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      toast.success(editing === 'new' ? 'Category created' : 'Category updated');
      setEditing(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Please try again.');
    }
  }

  async function toggleActive(category: Category) {
    try {
      await save.mutateAsync({
        id: category.categoryId,
        name: category.name,
        isActive: !category.isActive,
      });
      toast.success(category.isActive ? 'Category hidden from forms' : 'Category is available again');
    } catch (err) {
      toast.error('Could not update the category', {
        description: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="page max-w-4xl">
      <PageHeader
        title="Categories"
        description="The list students choose from when they file a report. Categories are referenced by existing reports, so they are deactivated rather than deleted."
        actions={
          <Button variant="primary" onClick={() => open('new')}>
            <Plus />
            New category
          </Button>
        }
      />

      {isLoading ? (
        <div className="skeleton h-64" />
      ) : categories.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <li key={category.categoryId}>
              <Card className="flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">{category.name}</h3>
                  {!category.isActive ? <Badge>Hidden</Badge> : null}
                </div>

                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {category.description ?? 'No description.'}
                </p>

                <div className="mt-auto flex gap-2 pt-3.5">
                  <Button variant="secondary" size="sm" onClick={() => open(category)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void toggleActive(category)}>
                    {category.isActive ? 'Hide' : 'Restore'}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Tags} title="No categories yet" description="Add the first one." />
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'New category' : 'Edit category'}</DialogTitle>
            <DialogDescription>
              Categories are worth 20 of the 100 matching points, so keep them broad enough that a
              student and a staff member would pick the same one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 pb-4">
            <Field label="Name" htmlFor="categoryName" required error={error ?? undefined}>
              <Input
                value={form.name}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }));
                  setError(null);
                }}
                placeholder="e.g. Electronics"
                maxLength={60}
              />
            </Field>

            <Field label="Description" htmlFor="categoryDescription" hint="Optional">
              <Textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Phones, laptops, earbuds, chargers and other devices"
                rows={3}
                maxLength={200}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={save.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
