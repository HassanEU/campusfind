import * as React from 'react';
import { toast } from 'sonner';
import { Search, Users as UsersIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge, EmptyState, ErrorState, PageHeader } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/form';
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/data';
import { useAdminUsers, useUpdateUser } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { formatDate, initials } from '@/lib/utils';
import type { AdminUser } from '@/types';

const ROLE_IDS = { STUDENT: 1, STAFF: 2, ADMIN: 3 } as const;

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { data: users, isLoading, isError, refetch } = useAdminUsers();
  const updateUser = useUpdateUser();

  const [search, setSearch] = React.useState('');
  const [pendingRole, setPendingRole] = React.useState<{ user: AdminUser; role: keyof typeof ROLE_IDS } | null>(null);
  const [pendingStatus, setPendingStatus] = React.useState<AdminUser | null>(null);

  const filtered = React.useMemo(() => {
    if (!users) return [];
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.department ?? '').toLowerCase().includes(term),
    );
  }, [users, search]);

  async function applyRole() {
    if (!pendingRole) return;
    try {
      await updateUser.mutateAsync({
        id: pendingRole.user.userId,
        roleId: ROLE_IDS[pendingRole.role],
      });
      toast.success(`${pendingRole.user.fullName} is now ${pendingRole.role.toLowerCase()}`);
      setPendingRole(null);
    } catch (error) {
      toast.error('Could not change the role', {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      });
    }
  }

  async function applyStatus() {
    if (!pendingStatus) return;
    try {
      await updateUser.mutateAsync({
        id: pendingStatus.userId,
        isActive: !pendingStatus.isActive,
      });
      toast.success(
        pendingStatus.isActive
          ? `${pendingStatus.fullName} can no longer sign in`
          : `${pendingStatus.fullName} can sign in again`,
      );
      setPendingStatus(null);
    } catch (error) {
      toast.error('Could not update the account', {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Users"
        description="Everyone with a CampusFind account. Promote a student to desk staff, or deactivate an account that should no longer sign in."
      />

      <div className="relative mb-4 max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email or department"
          className="pl-9"
          type="search"
          aria-label="Search users"
        />
      </div>

      {isError ? (
        <ErrorState title="We could not load the user list" onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="skeleton h-72" />
      ) : filtered.length ? (
        <TableWrap>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Person</TH>
                <TH className="hidden md:table-cell">Department</TH>
                <TH className="hidden lg:table-cell">Activity</TH>
                <TH className="hidden sm:table-cell">Joined</TH>
                <TH>Role</TH>
                <TH>Status</TH>
              </TR>
            </THead>

            <TBody>
              {filtered.map((user) => {
                const isMe = user.userId === me?.userId;

                return (
                  <TR key={user.userId}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-2xs font-semibold">
                          {initials(user.fullName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {user.fullName}
                            {isMe ? (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                (you)
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TD>

                    <TD className="hidden md:table-cell text-muted-foreground">
                      {user.department ?? '—'}
                      {user.enrollmentNo ? (
                        <span className="block text-xs">{user.enrollmentNo}</span>
                      ) : null}
                    </TD>

                    <TD className="hidden lg:table-cell text-xs text-muted-foreground tabular">
                      {user.lostReports} lost · {user.foundReports} found · {user.claimsMade} claims
                    </TD>

                    <TD className="hidden sm:table-cell text-xs text-muted-foreground tabular">
                      {formatDate(user.createdAt)}
                    </TD>

                    <TD>
                      {isMe ? (
                        <Badge tone="primary">{user.roleName}</Badge>
                      ) : (
                        <Select
                          value={user.roleName}
                          onValueChange={(value) =>
                            setPendingRole({ user, role: value as keyof typeof ROLE_IDS })
                          }
                        >
                          <SelectTrigger
                            className="h-8 w-[116px]"
                            aria-label={`Role for ${user.fullName}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STUDENT">Student</SelectItem>
                            <SelectItem value="STAFF">Staff</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TD>

                    <TD>
                      {isMe ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingStatus(user)}
                          className={user.isActive ? '' : 'text-danger'}
                        >
                          {user.isActive ? 'Active' : 'Deactivated'}
                        </Button>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrap>
      ) : (
        <EmptyState
          icon={UsersIcon}
          title="Nobody matches that search"
          description="Try a different name, email or department."
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingRole)}
        onOpenChange={(open) => !open && setPendingRole(null)}
        title="Change this person's role?"
        description={
          <>
            <span className="font-medium text-foreground">{pendingRole?.user.fullName}</span> will
            become <span className="font-medium text-foreground">{pendingRole?.role.toLowerCase()}</span>.
            {pendingRole?.role !== 'STUDENT'
              ? ' They will be able to review claims and release items at the desk.'
              : ' They will lose access to the desk and admin areas.'}
          </>
        }
        confirmLabel="Change role"
        loading={updateUser.isPending}
        onConfirm={applyRole}
      />

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        title={pendingStatus?.isActive ? 'Deactivate this account?' : 'Reactivate this account?'}
        description={
          pendingStatus?.isActive ? (
            <>
              <span className="font-medium text-foreground">{pendingStatus?.fullName}</span> will not
              be able to sign in. Their existing reports, claims and history are kept intact.
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{pendingStatus?.fullName}</span> will be
              able to sign in again.
            </>
          )
        }
        confirmLabel={pendingStatus?.isActive ? 'Deactivate' : 'Reactivate'}
        tone={pendingStatus?.isActive ? 'danger' : 'primary'}
        loading={updateUser.isPending}
        onConfirm={applyStatus}
      />
    </div>
  );
}
