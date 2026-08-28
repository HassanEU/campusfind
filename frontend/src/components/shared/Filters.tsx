import * as React from 'react';
import { Search, X } from 'lucide-react';

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useCategories, useLocations } from '@/hooks/queries';

/** Delays a fast-changing value so typing does not fire a request per keypress. */
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

const ANY = '__any__';

export interface FilterState {
  search: string;
  categoryId?: number;
  locationId?: number;
  status?: string;
}

export function FilterBar({
  value,
  onChange,
  statuses,
  searchPlaceholder = 'Search by name, brand or description',
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  statuses?: { value: string; label: string }[];
  searchPlaceholder?: string;
}) {
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();

  const active =
    Boolean(value.search) || value.categoryId != null || value.locationId != null || value.status != null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder={searchPlaceholder}
          className="pl-9"
          aria-label="Search"
          type="search"
        />
      </div>

      <Select
        value={value.categoryId ? String(value.categoryId) : ANY}
        onValueChange={(v) => onChange({ ...value, categoryId: v === ANY ? undefined : Number(v) })}
      >
        <SelectTrigger className="w-[150px]" aria-label="Filter by category">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.categoryId} value={String(c.categoryId)}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.locationId ? String(value.locationId) : ANY}
        onValueChange={(v) => onChange({ ...value, locationId: v === ANY ? undefined : Number(v) })}
      >
        <SelectTrigger className="w-[160px]" aria-label="Filter by location">
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All locations</SelectItem>
          {locations.map((l) => (
            <SelectItem key={l.locationId} value={String(l.locationId)}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {statuses ? (
        <Select
          value={value.status ?? ANY}
          onValueChange={(v) => onChange({ ...value, status: v === ANY ? undefined : v })}
        >
          <SelectTrigger className="w-[150px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any status</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {active ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ search: '' })}
          className="shrink-0"
        >
          <X />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
