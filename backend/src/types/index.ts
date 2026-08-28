export type RoleName = 'STUDENT' | 'STAFF' | 'ADMIN';

export type LostItemStatus = 'ACTIVE' | 'MATCHED' | 'CLAIMED' | 'RESOLVED';
export type FoundItemStatus = 'UNCLAIMED' | 'MATCHED' | 'CLAIM_PENDING' | 'VERIFIED' | 'RETURNED';
export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type MatchStatus = 'POTENTIAL' | 'CLAIMED' | 'CONFIRMED' | 'DISMISSED';

export interface AuthUser {
  userId: number;
  email: string;
  role: RoleName;
  fullName: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
