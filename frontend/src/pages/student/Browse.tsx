import * as React from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/primitives';
import { Pagination } from '@/components/ui/data';
import { ItemCard, ItemCardSkeleton } from '@/components/shared/ItemCard';
import { FilterBar, useDebounced, type FilterState } from '@/components/shared/Filters';
import { useFoundItems } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';

export default function Browse() {
  const { user } = useAuth();
  const [filters, setFilters] = React.useState<FilterState>({ search: '' });
  const [page, setPage] = React.useState(1);

  const search = useDebounced(filters.search, 300);
  React.useEffect(() => setPage(1), [search, filters.categoryId, filters.locationId]);

  const { data, isLoading, isError, refetch } = useFoundItems({
    page,
    pageSize: 12,
    search: search || undefined,
    categoryId: filters.categoryId,
    locationId: filters.locationId,
  });

  return (
    <div className="page">
      <PageHeader
        title="Found items at the desk"
        description="Everything currently in storage and waiting to be collected. Recognise something? File a report so it can be matched to you properly."
        actions={
          <Button asChild variant="secondary">
            <Link to="/app/report/found">
              <Plus />
              Hand something in
            </Link>
          </Button>
        }
      />

      <div className="mb-4">
        <FilterBar value={filters} onChange={setFilters} />
      </div>

      {isError ? (
        <ErrorState title="We could not load the found items" onRetry={() => void refetch()} />
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
              <li key={item.foundItemId}>
                <ItemCard
                  to={user?.role !== 'STUDENT' ? `/staff/storage?item=${item.foundItemId}` : undefined}
                  title={item.itemName}
                  description={item.description}
                  category={item.categoryName}
                  location={item.locationName}
                  date={item.foundDate}
                  dateLabel="Found on"
                  status={item.status}
                  brand={item.brand}
                  color={item.color}
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
          icon={PackageSearch}
          title={
            filters.search || filters.categoryId || filters.locationId
              ? 'Nothing matches those filters'
              : 'The shelf is empty right now'
          }
          description={
            filters.search || filters.categoryId || filters.locationId
              ? 'Try a broader search, or clear the filters.'
              : 'Nothing is waiting to be collected. File a lost report and we will let you know the moment something similar arrives.'
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
