export type Role = 'STUDENT' | 'STAFF' | 'ADMIN';

export interface User {
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  enrollmentNo: string | null;
  department: string | null;
  role: Role;
}

export interface Category {
  categoryId: number;
  name: string;
  icon: string;
  description: string | null;
  isActive: boolean;
}

export interface Location {
  locationId: number;
  name: string;
  building: string;
  floorLabel: string | null;
  description: string | null;
  isActive: boolean;
}

export interface LostItem {
  lostItemId: number;
  itemName: string;
  brand: string | null;
  color: string | null;
  description: string;
  identifyingDetails: string | null;
  lostDate: string;
  lostTimeApprox: string | null;
  status: 'ACTIVE' | 'MATCHED' | 'CLAIMED' | 'RESOLVED';
  createdAt: string;
  reportedBy: number;
  reporterName: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  locationId: number;
  locationName: string;
  locationBuilding: string;
  bestMatchScore?: number | null;
  matchCount?: number;
}

export interface FoundItem {
  foundItemId: number;
  itemName: string;
  brand: string | null;
  color: string | null;
  description: string;
  storageLocation?: string;
  foundDate: string;
  foundTimeApprox: string | null;
  status: 'UNCLAIMED' | 'MATCHED' | 'CLAIM_PENDING' | 'VERIFIED' | 'RETURNED';
  createdAt: string;
  reporterName?: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  locationId: number;
  locationName: string;
  locationBuilding: string;
  qrCode?: string | null;
  scanCount?: number;
  lastScannedAt?: string | null;
}

export interface MatchBreakdownItem {
  key: string;
  label: string;
  earned: number;
  weight: number;
  percent: number;
}

export interface Match {
  matchId: number;
  totalScore: number;
  categoryScore: number;
  brandScore: number;
  colorScore: number;
  locationScore: number;
  timeScore: number;
  descriptionScore: number;
  dayGap: number;
  reasons: string[];
  matchStatus: 'POTENTIAL' | 'CLAIMED' | 'CONFIRMED' | 'DISMISSED';
  matchedAt: string;
  breakdown: MatchBreakdownItem[];

  lostItemId: number;
  lostItemName: string;
  lostBrand: string | null;
  lostColor: string | null;
  lostDescription: string;
  lostDate: string;
  lostStatus: string;
  lostCategory: string;
  lostLocation: string;
  lostReportedBy: number;
  lostIdentifyingDetails?: string | null;

  foundItemId: number;
  foundItemName: string;
  foundBrand: string | null;
  foundColor: string | null;
  foundDescription: string;
  foundDate: string;
  foundStatus: string;
  foundCategory: string;
  foundLocation: string;
  storageLocation: string | null;
  qrCode: string | null;

  existingClaimId?: number | null;
}

export interface Claim {
  claimId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  claimDetails: string;
  reviewNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;

  claimantId: number;
  claimantName: string;
  claimantEmail: string;
  claimantEnrollment: string | null;
  claimantDepartment: string | null;

  foundItemId: number;
  foundItemName: string;
  foundItemStatus: string;
  storageLocation: string;
  foundDate: string;
  categoryName: string;
  foundLocation: string;
  qrCode: string | null;

  lostItemId: number | null;
  lostItemName: string | null;
  identifyingDetails: string | null;

  matchId: number | null;
  matchScore: number | null;

  reviewedBy: number | null;
  reviewerName: string | null;
}

export interface Verification {
  verificationId: number;
  method: 'QR_SCAN' | 'MANUAL_ID' | 'VISUAL';
  outcome: 'PASSED' | 'FAILED';
  qrCodeUsed: string | null;
  notes: string | null;
  verifiedAt: string;
  staffName: string;
}

export interface ReturnRecord {
  returnId: number;
  returnedAt: string;
  remarks: string | null;
  foundItemId: number;
  itemName: string;
  categoryName: string;
  foundLocation: string;
  claimId: number;
  lostItemId: number | null;
  returnedTo: number;
  returnedToName: string;
  returnedToEmail: string;
  releasedBy: number;
  releasedByName: string;
  daysInStorage: number;
}

export interface Notification {
  notificationId: number;
  title: string;
  body: string;
  notificationType: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditEntry {
  auditId: number;
  action: string;
  entityType: string;
  entityId: number;
  details: Record<string, unknown>;
  createdAt: string;
  actorId: number | null;
  actorName: string;
  actorRole: string;
}

export interface PlatformStats {
  totalLost: number;
  totalFound: number;
  activeLost: number;
  availableFound: number;
  potentialMatches: number;
  confirmedMatches: number;
  pendingClaims: number;
  returnedItems: number;
  registeredUsers: number;
  resolutionRate: number;
}

export interface StudentCounters {
  lostReports: number;
  activeReports: number;
  potentialMatches: number;
  openClaims: number;
  returnedItems: number;
  unreadNotices: number;
}

export interface StaffCounters {
  pendingClaims: number;
  itemsInStorage: number;
  awaitingVerification: number;
  returnedThisWeek: number;
  newThisWeek: number;
  avgDaysToReturn: number | null;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminUser {
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  enrollmentNo: string | null;
  department: string | null;
  isActive: boolean;
  createdAt: string;
  roleId: number;
  roleName: Role;
  lostReports: number;
  foundReports: number;
  claimsMade: number;
}
