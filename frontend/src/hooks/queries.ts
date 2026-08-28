import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, qs } from '@/lib/api';
import type {
  AdminUser, AuditEntry, Category, Claim, FoundItem, Location, LostItem, Match,
  Notification, Paginated, PlatformStats, ReturnRecord, StaffCounters,
  StudentCounters, Verification,
} from '@/types';

/**
 * Query keys are declared once so an invalidation can never miss a cache entry
 * because of a typo.
 */
export const keys = {
  categories: ['categories'] as const,
  locations: ['locations'] as const,
  publicStats: ['stats', 'public'] as const,
  studentDashboard: ['dashboard', 'student'] as const,
  staffDashboard: ['dashboard', 'staff'] as const,
  lostItems: (params: unknown) => ['lost-items', params] as const,
  lostItem: (id: number) => ['lost-item', id] as const,
  foundItems: (params: unknown) => ['found-items', params] as const,
  foundItem: (id: number) => ['found-item', id] as const,
  foundItemQr: (id: number) => ['found-item-qr', id] as const,
  matches: ['matches'] as const,
  match: (id: number) => ['match', id] as const,
  claims: (status?: string) => ['claims', status ?? 'all'] as const,
  claim: (id: number) => ['claim', id] as const,
  notifications: ['notifications'] as const,
  returns: ['returns'] as const,
  analytics: ['admin', 'analytics'] as const,
  auditLogs: (params: unknown) => ['admin', 'audit', params] as const,
  users: ['admin', 'users'] as const,
};

/* ---------------------------- reference data ------------------------------ */
// Categories and locations change perhaps once a semester, so they are cached
// for the whole session instead of being refetched on every form mount.

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: () => apiRequest<{ data: Category[] }>('/categories').then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: keys.locations,
    queryFn: () => apiRequest<{ data: Location[] }>('/locations').then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });
}

/* -------------------------------- public ---------------------------------- */

export function usePublicStats() {
  return useQuery({
    queryKey: keys.publicStats,
    queryFn: () =>
      apiRequest<{
        stats: PlatformStats;
        recentFound: { itemName: string; categoryName: string; locationName: string; foundDate: string }[];
      }>('/stats/public'),
    staleTime: 60 * 1000,
  });
}

/* ------------------------------ dashboards -------------------------------- */

export function useStudentDashboard() {
  return useQuery({
    queryKey: keys.studentDashboard,
    queryFn: () =>
      apiRequest<{
        counters: StudentCounters;
        topMatches: {
          matchId: number; totalScore: number; lostItemName: string;
          foundItemName: string; foundLocation: string; foundDate: string; lostItemId: number;
        }[];
        activeClaims: { claimId: number; status: string; foundItemName: string; submittedAt: string }[];
        notifications: Notification[];
      }>('/dashboard/student'),
  });
}

export function useStaffDashboard() {
  return useQuery({
    queryKey: keys.staffDashboard,
    queryFn: () =>
      apiRequest<{
        counters: StaffCounters;
        queue: {
          claimId: number; claimantName: string; foundItemName: string;
          qrCode: string | null; submittedAt: string; matchScore: number | null;
        }[];
        recentReturns: ReturnRecord[];
      }>('/dashboard/staff'),
  });
}

/* -------------------------------- items ----------------------------------- */

export interface ItemListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  locationId?: number;
  status?: string;
  scope?: 'mine' | 'all';
  sort?: 'newest' | 'oldest' | 'name';
}

export function useLostItems(params: ItemListParams) {
  return useQuery({
    queryKey: keys.lostItems(params),
    queryFn: () => apiRequest<Paginated<LostItem>>(`/lost-items${qs(params as never)}`),
    placeholderData: (previous) => previous, // keeps the table visible while paging
  });
}

export function useLostItem(id: number) {
  return useQuery({
    queryKey: keys.lostItem(id),
    queryFn: () =>
      apiRequest<{ item: LostItem; matches: Match[]; history: AuditEntry[] }>(`/lost-items/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useFoundItems(params: ItemListParams) {
  return useQuery({
    queryKey: keys.foundItems(params),
    queryFn: () => apiRequest<Paginated<FoundItem>>(`/found-items${qs(params as never)}`),
    placeholderData: (previous) => previous,
  });
}

export function useFoundItem(id: number) {
  return useQuery({
    queryKey: keys.foundItem(id),
    queryFn: () => apiRequest<{ item: FoundItem; history: AuditEntry[] }>(`/found-items/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useFoundItemQr(id: number, enabled = true) {
  return useQuery({
    queryKey: keys.foundItemQr(id),
    queryFn: () =>
      apiRequest<{
        qrCode: string; scanUrl?: string; itemName: string; foundItemId: number; dataUrl: string;
      }>(
        `/found-items/${id}/qr`,
      ),
    enabled: enabled && Number.isFinite(id) && id > 0,
    staleTime: Infinity, // a QR label never changes once issued
  });
}

export function useCreateLostItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<{ item: LostItem; matchesGenerated: number }>('/lost-items', {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lost-items'] });
      void qc.invalidateQueries({ queryKey: keys.studentDashboard });
      void qc.invalidateQueries({ queryKey: keys.matches });
    },
  });
}

export function useCreateFoundItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<{ item: FoundItem; matchesGenerated: number; qrDataUrl: string | null }>(
        '/found-items',
        { method: 'POST', body },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['found-items'] });
      void qc.invalidateQueries({ queryKey: keys.staffDashboard });
      void qc.invalidateQueries({ queryKey: keys.publicStats });
    },
  });
}

export function useCloseLostItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'ACTIVE' | 'RESOLVED' }) =>
      apiRequest(`/lost-items/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: keys.lostItem(variables.id) });
      void qc.invalidateQueries({ queryKey: ['lost-items'] });
      void qc.invalidateQueries({ queryKey: keys.studentDashboard });
    },
  });
}

export function useRescanMatches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<{ generated: number; matches: Match[] }>(`/lost-items/${id}/rescan`, {
        method: 'POST',
      }),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: keys.lostItem(id) });
      void qc.invalidateQueries({ queryKey: keys.matches });
    },
  });
}

/* -------------------------------- matches --------------------------------- */

export function useMatches() {
  return useQuery({
    queryKey: keys.matches,
    queryFn: () => apiRequest<{ data: Match[] }>('/matches').then((r) => r.data),
  });
}

export function useMatch(id: number) {
  return useQuery({
    queryKey: keys.match(id),
    queryFn: () => apiRequest<{ match: Match }>(`/matches/${id}`).then((r) => r.match),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useDismissMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest(`/matches/${id}/dismiss`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.matches });
      void qc.invalidateQueries({ queryKey: keys.studentDashboard });
    },
  });
}

/* --------------------------------- claims --------------------------------- */

export function useClaims(status?: string) {
  return useQuery({
    queryKey: keys.claims(status),
    queryFn: () => apiRequest<{ data: Claim[] }>(`/claims${qs({ status })}`).then((r) => r.data),
  });
}

export function useClaim(id: number) {
  return useQuery({
    queryKey: keys.claim(id),
    queryFn: () =>
      apiRequest<{ claim: Claim; verifications: Verification[]; history: AuditEntry[] }>(
        `/claims/${id}`,
      ),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useSubmitClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      foundItemId: number; lostItemId?: number; matchId?: number; claimDetails: string;
    }) => apiRequest<{ claim: Claim }>('/claims', { method: 'POST', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['claims'] });
      void qc.invalidateQueries({ queryKey: keys.matches });
      void qc.invalidateQueries({ queryKey: keys.studentDashboard });
      void qc.invalidateQueries({ queryKey: ['found-items'] });
    },
  });
}

/**
 * Approve / reject / cancel all go through one endpoint. On success every cache
 * that could have changed is invalidated, which is why the dashboard numbers
 * update the moment staff approves a claim.
 */
export function useDecideClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reviewNotes }: {
      id: number; action: 'APPROVE' | 'REJECT' | 'CANCEL'; reviewNotes?: string;
    }) => apiRequest<{ claim: Claim }>(`/claims/${id}`, {
      method: 'PATCH',
      body: { action, reviewNotes },
    }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: keys.claim(variables.id) });
      void qc.invalidateQueries({ queryKey: ['claims'] });
      void qc.invalidateQueries({ queryKey: keys.staffDashboard });
      void qc.invalidateQueries({ queryKey: keys.studentDashboard });
      void qc.invalidateQueries({ queryKey: keys.returns });
      void qc.invalidateQueries({ queryKey: ['found-items'] });
      void qc.invalidateQueries({ queryKey: ['lost-items'] });
      void qc.invalidateQueries({ queryKey: keys.analytics });
      void qc.invalidateQueries({ queryKey: keys.publicStats });
    },
  });
}

/* ----------------------------- QR + verifying ----------------------------- */

export function useQrLookup() {
  return useMutation({
    mutationFn: (code: string) =>
      apiRequest<{ item: FoundItem & {
        claimId: number | null; claimStatus: string | null; claimDetails: string | null;
        claimSubmittedAt: string | null; claimantName: string | null;
        claimantEnrollment: string | null; claimantDepartment: string | null;
        claimantIdentifyingDetails: string | null;
      } }>(`/qr/${encodeURIComponent(code)}`).then((r) => r.item),
  });
}

export function useRecordVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      claimId: number; method: 'QR_SCAN' | 'MANUAL_ID' | 'VISUAL';
      qrCode?: string; outcome: 'PASSED' | 'FAILED'; notes?: string;
    }) => apiRequest<{ verification: Verification }>('/verifications', { method: 'POST', body }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: keys.claim(variables.claimId) });
    },
  });
}

export function useReturns() {
  return useQuery({
    queryKey: keys.returns,
    queryFn: () => apiRequest<{ data: ReturnRecord[] }>('/returns').then((r) => r.data),
  });
}

/* ----------------------------- notifications ------------------------------ */

export function useNotifications() {
  return useQuery({
    queryKey: keys.notifications,
    queryFn: () => apiRequest<{ data: Notification[] }>('/notifications').then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.notifications });
      void qc.invalidateQueries({ queryKey: keys.studentDashboard });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.notifications });
      void qc.invalidateQueries({ queryKey: keys.studentDashboard });
    },
  });
}

/* --------------------------------- admin ---------------------------------- */

export interface AnalyticsPayload {
  stats: PlatformStats;
  reportsOverTime: { day: string; lostCount: number; foundCount: number; returnedCount: number }[];
  byCategory: {
    categoryId: number; categoryName: string; icon: string;
    lostCount: number; foundCount: number; returnedCount: number; returnRate: number;
  }[];
  byLocation: {
    locationId: number; locationName: string; building: string;
    lostCount: number; foundCount: number; totalReports: number;
  }[];
  matchQuality: { bucket: string; matchCount: number }[];
  topCategories: {
    categoryName: string; lostCount: number; resolvedCount: number; resolvedRate: number;
  }[];
}

export function useAnalytics() {
  return useQuery({
    queryKey: keys.analytics,
    queryFn: () => apiRequest<AnalyticsPayload>('/admin/analytics'),
  });
}

export function useAuditLogs(params: { page: number; pageSize: number; action?: string; entityType?: string }) {
  return useQuery({
    queryKey: keys.auditLogs(params),
    queryFn: () => apiRequest<Paginated<AuditEntry>>(`/admin/audit-logs${qs(params as never)}`),
    placeholderData: (previous) => previous,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: keys.users,
    queryFn: () => apiRequest<{ data: AdminUser[] }>('/admin/users').then((r) => r.data),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; roleId?: number; isActive?: boolean }) =>
      apiRequest(`/admin/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.users }),
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: number; name: string; description?: string; isActive?: boolean }) =>
      apiRequest(id ? `/admin/categories/${id}` : '/admin/categories', {
        method: id ? 'PATCH' : 'POST',
        body,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.categories }),
  });
}

export function useSaveLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: {
      id?: number; name: string; building: string; floorLabel?: string;
      description?: string; isActive?: boolean;
    }) =>
      apiRequest(id ? `/admin/locations/${id}` : '/admin/locations', {
        method: id ? 'PATCH' : 'POST',
        body,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.locations }),
  });
}
