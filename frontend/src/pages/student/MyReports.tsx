import * as React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/primitives';
import { Pagination, Tabs, TabsList, TabsTrigger } from '@/components/ui/data';
import { ItemCard, ItemCardSkeleton } from '@/components/shared/ItemCard';
import { FilterBar, useDebounced, type FilterState } from '@/components/shared/Filters';
import { useLostItems } from '@/hooks/queries';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'ACTIVE', label: 'Still missing' },
  { value: 'MATCHED', label: 'Matched' },
  { value: 'CLAIMED', label: 'Claimed' },
  { value: 'RESOLVED', label: 'Resolved' },
];

export default function MyReports() {
  const [tab, setTab] = React.useState('all');
  const [filters, setFilters] = React.useState<FilterState>({ search: '' });
  const [page, setPage] = React.useState(1);

  // Debounced so typing in the search box does not fire a request per keystroke.
  const search = useDebounced(filters.search, 300);

  // Any filter change should return the user to page one, otherwise they can
  // land on an empty page 4 of a 2-page result.
  React.useEffect(() => setPage(1), [search, filters.categoryId, filters.locationId, tab]);

  const { data, isLoading, isError, refetch } = useLostItems({
    scope: 'mine',
    page,
    pageSize: 12,
    search: search || undefined,
    categoryId: filters.categoryId,
    locationId: filters.locationId,
    status: tab === 'all' ? undefined : tab,
  });

  return (
    <div className="page">
      <PageHeader
        title="My reports"
        description="Everything you have reported lost, and where each one stands."
        actions={
          <Button asChild variant="primary">
            <Link to="/app/report/lost">
              <Plus />
              New report
            </Link>
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mb-4">
        <FilterBar value={filters} onChange={setFilters} searchPlaceholder="Search your reports" />
      </div>

      {isError ? (
        <ErrorState title="We could not load your reports" onRetry={() => void refetch()} />
      ) : isLoading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.data.length ? (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((item) => (
              <li key={item.lostItemId}>
                <ItemCard
                  to={`/app/reports/${item.lostItemId}`}
                  title={item.itemName}
                  description={item.description}
                  category={item.categoryName}
                  location={item.locationName}
                  date={item.lostDate}
                  dateLabel="Lost on"
                  status={item.status}
                  brand={item.brand}
                  color={item.color}
                  score={item.bestMatchScore ?? undefined}
                />
              </li>
            ))}
          </ul>

          <Pagination
            className="mt-5"
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title={
            filters.search || filters.categoryId || tab !== 'all'
              ? 'Nothing matches those filters'
              : 'You have not reported anything yet'
          }
          description={
            filters.search || filters.categoryId || tab !== 'all'
              ? 'Try clearing the filters to see all of your reports.'
              : 'File a report and CampusFind will start comparing it against everything handed in at the desk.'
          }
          action={
            <Button asChild variant="primary" size="sm">
              <Link to="/app/report/lost">Report a lost item</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
