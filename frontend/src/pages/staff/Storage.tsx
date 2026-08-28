import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, PackageSearch, Plus, Printer, QrCode } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, PageHeader, StatusBadge } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pagination, Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/data';
import { FilterBar, useDebounced, type FilterState } from '@/components/shared/Filters';
import { useFoundItems, useFoundItemQr } from '@/hooks/queries';
import { formatDate } from '@/lib/utils';

const STATUSES = [
  { value: 'UNCLAIMED', label: 'In storage' },
  { value: 'MATCHED', label: 'Matched' },
  { value: 'CLAIM_PENDING', label: 'Claim pending' },
  { value: 'RETURNED', label: 'Returned' },
];

/** Shows the stored QR label for one item, with print and download. */
function QrDialog({ itemId, onClose }: { itemId: number | null; onClose: () => void }) {
  const { data, isLoading, isError } = useFoundItemQr(itemId ?? 0, itemId != null);

  function print() {
    if (!data) return;
    const win = window.open('', '_blank', 'width=460,height=620');
    if (!win) return;
    win.document.write(`
      <!doctype html><html><head><title>${data.qrCode}</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:0;padding:32px;text-align:center}
        h1{font-size:15px;margin:0 0 4px}p{font-size:12px;color:#555;margin:0 0 20px}
        img{width:260px;height:260px}
        code{display:block;margin-top:14px;font-size:15px;letter-spacing:.06em;font-weight:600}
      </style></head><body>
        <h1>CampusFind</h1><p>${data.itemName}</p>
        <img src="${data.dataUrl}" alt="${data.qrCode}" /><code>${data.qrCode}</code>
        <script>window.onload=function(){window.print()}<\/script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <Dialog open={itemId != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR label</DialogTitle>
          <DialogDescription>
            {data?.itemName ?? 'Loading the label for this item.'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5">
          {isLoading ? (
            <div className="skeleton mx-auto size-48" />
          ) : isError || !data ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No QR label has been issued for this item.
            </p>
          ) : (
            <>
              <img
                src={data.dataUrl}
                alt={`QR code ${data.qrCode}`}
                className="mx-auto size-48 rounded-md bg-white p-2"
              />
              <code className="mt-3 block text-center font-mono text-sm font-semibold tracking-wider">
                {data.qrCode}
              </code>
              {data.scanUrl && data.scanUrl !== data.qrCode ? (
                <p className="mt-2 break-all text-center text-2xs leading-relaxed text-muted-foreground">
                  Scanning opens the verification screen at this host.
                </p>
              ) : null}

              <div className="mt-4 flex gap-2">
                <Button variant="primary" className="flex-1" onClick={print}>
                  <Printer />
                  Print
                </Button>
                <Button asChild variant="secondary" className="flex-1">
                  <a href={data.dataUrl} download={`${data.qrCode}.png`}>
                    <Download />
                    Download
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Storage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = React.useState<FilterState>({ search: '' });
  const [page, setPage] = React.useState(1);
  const [qrItem, setQrItem] = React.useState<number | null>(
    searchParams.get('item') ? Number(searchParams.get('item')) : null,
  );

  const search = useDebounced(filters.search, 300);
  React.useEffect(() => setPage(1), [search, filters.categoryId, filters.locationId, filters.status]);

  const { data, isLoading, isError, refetch } = useFoundItems({
    page,
    pageSize: 15,
    search: search || undefined,
    categoryId: filters.categoryId,
    locationId: filters.locationId,
    status: filters.status,
  });

  return (
    <div className="page">
      <PageHeader
        title="Storage"
        description="Every item ever handed in, where it is kept and the label attached to it."
        actions={
          <Button asChild variant="primary">
            <Link to="/app/report/found">
              <Plus />
              Log found item
            </Link>
          </Button>
        }
      />

      <div className="mb-4">
        <FilterBar
          value={filters}
          onChange={setFilters}
          statuses={STATUSES}
          searchPlaceholder="Search by item name, brand or description"
        />
      </div>

      {isError ? (
        <ErrorState title="We could not load storage" onRetry={() => void refetch()} />
      ) : isLoading && !data ? (
        <div className="skeleton h-72" />
      ) : data?.data.length ? (
        <>
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Item</TH>
                  <TH className="hidden sm:table-cell">Category</TH>
                  <TH className="hidden md:table-cell">Found at</TH>
                  <TH className="hidden lg:table-cell">Stored in</TH>
                  <TH>Status</TH>
                  <TH className="hidden md:table-cell">QR</TH>
                  <TH><span className="sr-only">Actions</span></TH>
                </TR>
              </THead>

              <TBody>
                {data.data.map((item) => (
                  <TR key={item.foundItemId}>
                    <TD>
                      <p className="max-w-[220px] truncate font-medium">{item.itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.foundDate)}
                        {item.brand ? ` · ${item.brand}` : ''}
                      </p>
                    </TD>
                    <TD className="hidden sm:table-cell text-muted-foreground">
                      {item.categoryName}
                    </TD>
                    <TD className="hidden md:table-cell text-muted-foreground">
                      {item.locationName}
                    </TD>
                    <TD className="hidden lg:table-cell text-muted-foreground">
                      {item.storageLocation ?? '—'}
                    </TD>
                    <TD>
                      <StatusBadge status={item.status} />
                    </TD>
                    <TD className="hidden md:table-cell">
                      {item.qrCode ? (
                        <code className="font-mono text-xs text-muted-foreground">{item.qrCode}</code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQrItem(item.foundItemId)}
                        aria-label={`Show QR label for ${item.itemName}`}
                      >
                        <QrCode />
                        <span className="hidden sm:inline">Label</span>
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>

          <Pagination
            className="mt-4"
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
          title="Nothing matches those filters"
          description="Try clearing the search or choosing a different status."
        />
      )}

      <QrDialog itemId={qrItem} onClose={() => setQrItem(null)} />
    </div>
  );
}
