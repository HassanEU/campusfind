import * as React from 'react';
import { toast } from 'sonner';
import { MapPin, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui/primitives';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/form';
import { useLocations, useSaveLocation } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import type { Location } from '@/types';

export default function AdminLocations() {
  const { data: locations = [], isLoading } = useLocations();
  const save = useSaveLocation();

  const [editing, setEditing] = React.useState<Location | 'new' | null>(null);
  const [form, setForm] = React.useState({ name: '', building: '', floorLabel: '', description: '' });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Grouping by building mirrors how the matching engine reasons about place:
  // same location scores 20, same building scores 12.
  const grouped = React.useMemo(() => {
    const map = new Map<string, Location[]>();
    for (const location of locations) {
      const list = map.get(location.building) ?? [];
      list.push(location);
      map.set(location.building, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [locations]);

  function open(target: Location | 'new') {
    setEditing(target);
    setErrors({});
    setForm(
      target === 'new'
        ? { name: '', building: '', floorLabel: '', description: '' }
        : {
            name: target.name,
            building: target.building,
            floorLabel: target.floorLabel ?? '',
            description: target.description ?? '',
          },
    );
  }

  async function handleSave() {
    const nextErrors: Record<string, string> = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Give the location a name.';
    if (form.building.trim().length < 2) nextErrors.building = 'Which building is it in?';

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      await save.mutateAsync({
        id: editing === 'new' || editing === null ? undefined : editing.locationId,
        name: form.name.trim(),
        building: form.building.trim(),
        floorLabel: form.floorLabel.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      toast.success(editing === 'new' ? 'Location added' : 'Location updated');
      setEditing(null);
    } catch (error) {
      toast.error('Could not save the location', {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      });
    }
  }

  async function toggleActive(location: Location) {
    try {
      await save.mutateAsync({
        id: location.locationId,
        name: location.name,
        building: location.building,
        isActive: !location.isActive,
      });
      toast.success(location.isActive ? 'Location hidden from forms' : 'Location is available again');
    } catch (error) {
      toast.error('Could not update the location', {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="page max-w-4xl">
      <PageHeader
        title="Locations"
        description="Places on campus where things are lost and handed in. Two reports at the same location score 20 points; two in the same building score 12."
        actions={
          <Button variant="primary" onClick={() => open('new')}>
            <Plus />
            New location
          </Button>
        }
      />

      {isLoading ? (
        <div className="skeleton h-64" />
      ) : grouped.length ? (
        <div className="space-y-5">
          {grouped.map(([building, items]) => (
            <section key={building}>
              <h2 className="mb-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                {building}
              </h2>

              <ul className="grid gap-2 sm:grid-cols-2">
                {items.map((location) => (
                  <li key={location.locationId}>
                    <Card className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{location.name}</p>
                          {!location.isActive ? <Badge>Hidden</Badge> : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {location.floorLabel ?? 'No floor recorded'}
                        </p>
                        {location.description ? (
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {location.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col gap-1">
                        <Button variant="ghost" size="sm" onClick={() => open(location)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void toggleActive(location)}>
                          {location.isActive ? 'Hide' : 'Restore'}
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState icon={MapPin} title="No locations yet" description="Add the first one." />
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'New location' : 'Edit location'}</DialogTitle>
            <DialogDescription>
              Use the building name consistently — it is what lets the matching engine award partial
              credit when two reports are in different rooms of the same block.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 pb-4">
            <Field label="Name" htmlFor="locationName" required error={errors.name}>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="e.g. Central Library"
                maxLength={80}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Building" htmlFor="building" required error={errors.building}>
                <Input
                  value={form.building}
                  onChange={(event) => setForm((prev) => ({ ...prev, building: event.target.value }))}
                  placeholder="e.g. Central Library"
                  maxLength={80}
                />
              </Field>

              <Field label="Floor" htmlFor="floorLabel" hint="Optional">
                <Input
                  value={form.floorLabel}
                  onChange={(event) => setForm((prev) => ({ ...prev, floorLabel: event.target.value }))}
                  placeholder="e.g. Ground floor"
                  maxLength={30}
                />
              </Field>
            </div>

            <Field label="Description" htmlFor="locationDescription" hint="Optional">
              <Textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Reading halls, issue counter and reference section"
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
