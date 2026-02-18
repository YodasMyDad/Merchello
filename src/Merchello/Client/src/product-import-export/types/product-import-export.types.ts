export enum ProductSyncDirection {
  Import = 0,
  Export = 1,
}

export enum ProductSyncProfile {
  ShopifyStrict = 0,
  MerchelloExtended = 1,
}

export enum ProductSyncRunStatus {
  Queued = 0,
  Running = 1,
  Completed = 2,
  Failed = 3,
}

export enum ProductSyncIssueSeverity {
  Info = 0,
  Warning = 1,
  Error = 2,
}

export enum ProductSyncStage {
  Validation = 0,
  Queueing = 1,
  Matching = 2,
  Mapping = 3,
  Import = 4,
  Export = 5,
  Images = 6,
  Finalizing = 7,
  System = 8,
}

export interface ValidateProductImportDto {
  profile: ProductSyncProfile;
  maxIssues: number | null;
}

export interface StartProductImportDto {
  profile: ProductSyncProfile;
  continueOnImageFailure: boolean;
  maxIssues: number | null;
}

export interface StartProductExportDto {
  profile: ProductSyncProfile;
}

export interface ProductSyncIssueDto {
  id: string;
  runId: string;
  severity: ProductSyncIssueSeverity;
  stage: ProductSyncStage;
  code: string;
  message: string;
  rowNumber: number | null;
  handle: string | null;
  sku: string | null;
  field: string | null;
  dateCreatedUtc: string;
}

export interface ProductSyncRunDto {
  id: string;
  direction: ProductSyncDirection;
  profile: ProductSyncProfile;
  status: ProductSyncRunStatus;
  statusLabel: string;
  statusCssClass: string;
  requestedByUserId: string | null;
  requestedByUserName: string | null;
  inputFileName: string | null;
  outputFileName: string | null;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  warningCount: number;
  errorCount: number;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  dateCreatedUtc: string;
  errorMessage: string | null;
}

export interface ProductSyncRunPageDto {
  items: ProductSyncRunDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ProductSyncIssuePageDto {
  items: ProductSyncIssueDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ProductImportValidationDto {
  isValid: boolean;
  rowCount: number;
  distinctHandleCount: number;
  warningCount: number;
  errorCount: number;
  issues: ProductSyncIssueDto[];
}

export interface ProductSyncRunQueryParams {
  direction?: ProductSyncDirection | null;
  status?: ProductSyncRunStatus | null;
  page?: number;
  pageSize?: number;
}

export interface ProductSyncIssueQueryParams {
  severity?: ProductSyncIssueSeverity | null;
  page?: number;
  pageSize?: number;
}

export interface ProductSyncExportDownloadResult {
  blob: Blob;
  fileName: string;
}
