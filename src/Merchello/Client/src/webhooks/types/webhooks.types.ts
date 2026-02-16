// Webhook Authentication Types
export enum WebhookAuthType {
  None = 0,
  HmacSha256 = 1,
  HmacSha512 = 2,
  BearerToken = 3,
  ApiKey = 4,
  BasicAuth = 5,
}

// Outbound Delivery Status
export enum OutboundDeliveryStatus {
  Pending = 0,
  Sending = 1,
  Succeeded = 2,
  Failed = 3,
  Retrying = 4,
  Abandoned = 5,
}

// Outbound Delivery Type
export enum OutboundDeliveryType {
  Webhook = 0,
  Email = 1,
}

// Webhook Subscription DTOs
export interface WebhookSubscriptionDto {
  id: string;
  name: string;
  topic: string;
  topicDisplayName: string;
  targetUrl: string;
  isActive: boolean;
  authType: WebhookAuthType;
  authTypeDisplay: string;
  successCount: number;
  failureCount: number;
  lastTriggeredUtc: string | null;
  lastSuccessUtc: string | null;
  lastErrorMessage: string | null;
  dateCreated: string;
}

export interface WebhookSubscriptionDetailDto extends WebhookSubscriptionDto {
  apiVersion: string | null;
  timeoutSeconds: number;
  filterExpression: string | null;
  headers: Record<string, string>;
  recentDeliveries: OutboundDeliveryDto[];
  secret?: string;
}

export interface CreateWebhookSubscriptionDto {
  name: string;
  topic: string;
  targetUrl: string;
  authType?: WebhookAuthType;
  authHeaderName?: string;
  authHeaderValue?: string;
  timeoutSeconds?: number;
  filterExpression?: string;
  headers?: Record<string, string>;
}

export interface UpdateWebhookSubscriptionDto {
  name?: string;
  targetUrl?: string;
  isActive?: boolean;
  authType?: WebhookAuthType;
  authHeaderName?: string;
  authHeaderValue?: string;
  timeoutSeconds?: number;
  filterExpression?: string;
  headers?: Record<string, string>;
}

// Outbound Delivery DTOs
export interface OutboundDeliveryDto {
  id: string;
  deliveryType: OutboundDeliveryType;
  deliveryTypeDisplay: string;
  configurationId: string;
  topic: string;
  entityId: string | null;
  entityType: string | null;
  status: OutboundDeliveryStatus;
  statusDisplay: string;
  statusCssClass: string;
  responseStatusCode: number | null;
  errorMessage: string | null;
  dateCreated: string;
  dateCompleted: string | null;
  durationMs: number;
  attemptNumber: number;
}

export interface OutboundDeliveryDetailDto extends OutboundDeliveryDto {
  // Webhook-specific
  targetUrl: string | null;
  requestBody: string | null;
  requestHeaders: string | null;
  responseBody: string | null;
  responseHeaders: string | null;
  // Email-specific (not used for webhooks but included for completeness)
  emailRecipients: string | null;
  emailSubject: string | null;
  emailFrom: string | null;
  emailBody: string | null;
}

// Webhook Topic DTOs
export interface WebhookTopicDto {
  key: string;
  displayName: string;
  description: string;
  category: string;
  samplePayload: string | null;
}

export interface WebhookTopicCategoryDto {
  name: string;
  topics: WebhookTopicDto[];
}

// Stats and Result DTOs
export interface WebhookStatsDto {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  pendingDeliveries: number;
  abandonedDeliveries: number;
  successRate: number;
  averageResponseTimeMs: number;
  lastDeliveryUtc: string | null;
}

export interface OutboundDeliveryResultDto {
  success: boolean;
  statusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  durationMs: number;
  deliveryId: string | null;
}

export interface PingWebhookDto {
  url: string;
}

// Query Parameters
export interface WebhookSubscriptionQueryParams {
  topic?: string;
  isActive?: boolean;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface OutboundDeliveryQueryParams {
  status?: OutboundDeliveryStatus;
  statuses?: OutboundDeliveryStatus[];
  page?: number;
  pageSize?: number;
}

// Paginated Response
export interface WebhookSubscriptionPageDto {
  items: WebhookSubscriptionDto[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OutboundDeliveryPageDto {
  items: OutboundDeliveryDto[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Modal Data Types
export interface WebhookSubscriptionModalData {
  subscription?: WebhookSubscriptionDetailDto;
  topics: WebhookTopicCategoryDto[];
}

export interface WebhookSubscriptionModalValue {
  saved: boolean;
}

export interface WebhookTestModalData {
  subscription: WebhookSubscriptionDto;
}

export interface WebhookTestModalValue {
  tested: boolean;
}

export interface DeliveryDetailModalData {
  deliveryId: string;
}

export interface DeliveryDetailModalValue {
  retried: boolean;
}

// Helper function to get auth type display options
export function getAuthTypeOptions(): Array<{ name: string; value: string }> {
  return [
    { name: "None", value: String(WebhookAuthType.None) },
    { name: "HMAC-SHA256 (Recommended)", value: String(WebhookAuthType.HmacSha256) },
    { name: "HMAC-SHA512", value: String(WebhookAuthType.HmacSha512) },
    { name: "Bearer Token", value: String(WebhookAuthType.BearerToken) },
    { name: "API Key", value: String(WebhookAuthType.ApiKey) },
    { name: "Basic Auth", value: String(WebhookAuthType.BasicAuth) },
  ];
}
