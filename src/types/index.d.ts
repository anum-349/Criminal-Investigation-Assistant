// Type definitions for refactored utilities

// ============================================================================
// API Common Types
// ============================================================================

export interface AuthHeader {
    Authorization?: string;
}

export interface ApiError {
    response?: {
        data?: {
            detail?: string | Array<{ msg?: string }>;
        };
    };
    message?: string;
}

export interface PhotoFailure {
    entityId?: string;
    suspectId?: string;
    victimId?: string;
    witnessId?: string;
    evidenceId?: string;
    photoName: string;
    error: string;
}

export interface PhotoItem {
    existingPhotoId?: string;
    dataUrl: string;
    name?: string;
    fileName?: string;
    caption?: string;
}

export interface FileItem {
    file?: File;
    fileDataUrl?: string;
    fileName?: string;
    fileMime?: string;
}

export interface EvidenceItem extends FileItem {
    type?: string;
    description?: string;
    dateCollected?: string;
    collectedBy?: string;
    status?: string;
    photos?: PhotoItem[];
}

export interface PersonItem {
    name?: string;
    cnic?: string;
    age?: string | number;
    contact?: string;
    address?: string;
    photoUrl?: PhotoItem[] | null;
    _hadPhoto?: boolean;
}

export interface SuspectItem extends PersonItem {
    status?: string;
    gender?: string;
    occupation?: string;
    relationToCase?: string;
    reason?: string;
    alibi?: string;
    physicalDescription?: string;
    knownAffiliations?: string;
    arrivalMethod?: string;
    vehicleDescription?: string;
    notes?: string;
    criminalRecord?: boolean;
    arrested?: boolean;
}

export interface VictimItem extends PersonItem {
    status?: string;
    primaryLabel?: string;
    relation?: string;
    caseType?: string;
    injuryType?: string;
    injurySummary?: string;
    threatLevel?: string;
    protectionRequired?: boolean;
}

export interface WitnessItem extends PersonItem {
    witnessType?: string;
    relationToCase?: string;
    credibility?: string;
    status?: string;
    description?: string;
    anonymous?: boolean;
    protectionRequired?: boolean;
}

// ============================================================================
// Hooks Types
// ============================================================================

export interface FormState<T> {
    values: T;
    errors: Record<keyof T, string>;
    touched: Record<keyof T, boolean>;
    setValues: (values: T | ((prev: T) => T)) => void;
    setErrors: (errors: Record<keyof T, string>) => void;
    setTouched: (touched: Record<keyof T, boolean>) => void;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    resetForm: () => void;
}

export interface SortAndFilterState {
    sortField: string;
    sortDir: 'asc' | 'desc';
    currentPage: number;
    setCurrentPage: (page: number) => void;
    handleSort: (field: string) => void;
}

export interface PaginationState {
    currentPage: number;
    setCurrentPage: (page: number) => void;
    totalPages: number;
    start: number;
    end: number;
}

export interface ConfirmDialogState {
    confirmId: string | null;
    busyId: string | null;
    open: (id: string) => void;
    close: () => void;
    setBusy: (id: string) => void;
    clearBusy: () => void;
}

export interface RequestSequence {
    nextSeq: () => number;
    isStale: (seq: number) => boolean;
}

export interface AsyncState<T> {
    execute: () => Promise<T>;
    loading: boolean;
    error: Error | null;
    data: T | null;
}

// ============================================================================
// Constants Types
// ============================================================================

export interface PageSize {
    CASES: number;
    EVIDENCES: number;
    VICTIMS: number;
    SUSPECTS: number;
    WITNESSES: number;
    NOTIFICATIONS: number;
}

export interface StatusTab {
    key: string;
    label: string;
}

export interface CaseStatus {
    code: string;
    label: string;
    is_terminal: boolean;
}

export interface SeverityLevel {
    CRITICAL: string;
    HIGH: string;
    MEDIUM: string;
    LOW: string;
}

export interface NotificationType {
    SUSPECT_DETECTED: string;
    CRIME_HOTSPOT: string;
    CASE_UPDATE: string;
    SYSTEM: string;
}

export interface ApiEndpoints {
    CASES: string;
    VICTIMS: string;
    SUSPECTS: string;
    WITNESSES: string;
    EVIDENCES: string;
    NOTIFICATIONS: string;
    AUTH: string;
    DASHBOARD: string;
}

export interface MessageTemplates {
    GENERIC: string;
    NETWORK: string;
    AUTH: string;
    VALIDATION: string;
    REQUIRED_FIELDS: string;
}

// ============================================================================
// Styling Types
// ============================================================================

export type StatusVariant = 'success' | 'warning' | 'default';
export type BadgeVariant = 'destructive' | 'warning' | 'default' | 'success';
export type SeverityDot = 'bg-red-500' | 'bg-orange-400' | 'bg-blue-400' | 'bg-slate-300';

export interface SeverityStyle {
    textColor: string;
    bgColor: string;
    border: string;
}

// ============================================================================
// Formatter Types
// ============================================================================

export interface FormattedDate {
    day: string;
    month: string;
    hour: string;
    minute: string;
}

export type TimeFormat = 'just now' | string;

// ============================================================================
// Service Response Types
// ============================================================================

export interface CaseListResponse {
    items: Array<any>;
    total: number;
    tab_counts: Record<string, number>;
    filter_options: {
        crime_types: string[];
        severities: string[];
    };
}

export interface PhotoUploadResponse {
    photoUrl?: string;
    photos?: PhotoItem[];
}

export interface DraftResponse {
    draftId: string;
    title: string;
    updatedAt: string;
    progressPercent?: number;
}

export interface LeadResponse {
    id: string;
    type: string;
    severity: string;
    description: string;
    status: string;
    confidence?: number;
}

export interface NotificationResponse {
    id: string;
    title: string;
    message: string;
    severity?: string;
    isRead: boolean;
    createdAt: string;
}

export interface PreferencesResponse {
    sound_alerts: boolean;
    email_notifications: boolean;
    [key: string]: any;
}

// ============================================================================
// API Service Types
// ============================================================================

export interface CaseApiService {
    createCase: (formData: any) => Promise<{ caseId: string }>;
    registerCaseFull: (formData: any) => Promise<any>;
    fetchLinkedCases: (caseId: string) => Promise<any>;
    regenerateLinkedCases: (caseId: string) => Promise<any>;
}

export interface EntityApiService {
    addToCase: (caseId: string, items: any[]) => Promise<any>;
    updateEntity: (caseId: string, entityId: string, data: any) => Promise<any>;
    uploadPhoto: (caseId: string, entityId: string, data: PhotoItem) => Promise<PhotoUploadResponse>;
    deletePhoto: (caseId: string, entityId: string) => Promise<any>;
}

export interface CommonApiService {
    getAuthHeader: () => AuthHeader;
    formatApiError: (err: ApiError, fallback?: string) => string;
    parseAge: (v: any) => number | undefined;
    fileToDataUrl: (file: File) => Promise<string | null>;
    isNewPhoto: (p: any) => boolean;
    hasNewFile: (ev: any) => boolean;
    uploadPhotos: (caseId: string, entityType: string, ids: string[], items: any[]) => Promise<PhotoFailure[]>;
}

// ============================================================================
// Hook Service Types
// ============================================================================

export interface HookServices {
    useDebounce: <T>(value: T, ms?: number) => T;
    useAsync: <T>(fn: () => Promise<T>, immediate?: boolean) => AsyncState<T>;
    useSortAndFilter: (field?: string, dir?: 'asc' | 'desc') => SortAndFilterState;
    usePagination: (total?: number, pageSize?: number) => PaginationState;
    useConfirmDialog: () => ConfirmDialogState;
    useFormState: <T>(initial: T) => FormState<T>;
    useLocalStorage: <T>(key: string, initial: T) => [T, (value: T | ((prev: T) => T)) => void];
    useOutsideClick: (ref: React.RefObject<HTMLElement>, callback: () => void) => void;
    useRequestSequence: () => RequestSequence;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    start: number;
    end: number;
    itemLabel?: string;
}

export interface TableProps {
    children: React.ReactNode;
    striped?: boolean;
}

export interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

export interface ButtonProps {
    children: React.ReactNode;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    disabled?: boolean;
    onClick?: () => void;
    className?: string;
}

export interface CardProps {
    children: React.ReactNode;
    className?: string;
}

// ============================================================================
// Export all types as a namespace
// ============================================================================

declare global {
    namespace CIA {
        export type AuthHeader = AuthHeader;
        export type ApiError = ApiError;
        export type PhotoFailure = PhotoFailure;
        export type SuspectItem = SuspectItem;
        export type VictimItem = VictimItem;
        export type WitnessItem = WitnessItem;
        export type EvidenceItem = EvidenceItem;
        export type FormState<T> = FormState<T>;
        export type SortAndFilterState = SortAndFilterState;
        export type PaginationState = PaginationState;
    }
}
