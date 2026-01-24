// Fulfilment Provider types matching the API DTOs

// Import shared types for provider configuration fields
import type {
  SelectOptionDto,
  ConfigurationFieldType,
  ProviderFieldDto,
} from "@shared/types/provider-fields.types.js";

// Re-export shared types for convenience
export type { SelectOptionDto, ConfigurationFieldType };

// ============================================
// Enums
// ============================================

/** Inventory synchronization mode for fulfilment providers */
export enum InventorySyncMode {
  /** Full sync - overwrites inventory levels completely */
  Full = 0,
  /** Delta sync - applies adjustments to existing levels */
  Delta = 1,
}

/** Type of fulfilment sync operation */
export enum FulfilmentSyncType {
  /** Products pushed out to the 3PL */
  ProductsOut = 0,
  /** Inventory pulled in from the 3PL */
  InventoryIn = 1,
}

/** Status of a fulfilment sync operation */
export enum FulfilmentSyncStatus {
  /** Sync is queued but not started */
  Pending = 0,
  /** Sync is currently running */
  Running = 1,
  /** Sync completed successfully */
  Completed = 2,
  /** Sync failed */
  Failed = 3,
}

/** API communication style used by a fulfilment provider */
export enum FulfilmentApiStyle {
  /** REST API */
  Rest = 0,
  /** GraphQL API */
  GraphQL = 1,
  /** SFTP file-based integration */
  Sftp = 2,
}

// ============================================
// Provider DTOs
// ============================================

/** Fulfilment provider with metadata and configuration status */
export interface FulfilmentProviderDto {
  key: string;
  displayName: string;
  icon?: string;
  iconSvg?: string;
  description?: string;
  setupInstructions?: string;
  // Capabilities
  supportsOrderSubmission: boolean;
  supportsOrderCancellation: boolean;
  supportsWebhooks: boolean;
  supportsPolling: boolean;
  supportsProductSync: boolean;
  supportsInventorySync: boolean;
  apiStyle: FulfilmentApiStyle;
  apiStyleLabel: string;
  /** Whether this provider is enabled (has a configuration with IsEnabled = true) */
  isEnabled: boolean;
  /** The configuration ID if configured */
  configurationId?: string;
}

/** Fulfilment provider list item for display in the backoffice */
export interface FulfilmentProviderListItemDto {
  key: string;
  displayName: string;
  icon?: string;
  iconSvg?: string;
  description?: string;
  isEnabled: boolean;
  configurationId?: string;
  sortOrder: number;
  inventorySyncMode: InventorySyncMode;
  inventorySyncModeLabel: string;
  apiStyle: FulfilmentApiStyle;
  apiStyleLabel: string;
  // Capabilities summary
  supportsOrderSubmission: boolean;
  supportsWebhooks: boolean;
  supportsProductSync: boolean;
  supportsInventorySync: boolean;
}

/** Configuration field definition for dynamic UI - uses shared ProviderFieldDto */
export type FulfilmentProviderFieldDto = ProviderFieldDto;

// ============================================
// CRUD DTOs
// ============================================

/** Request to create/enable a fulfilment provider configuration */
export interface CreateFulfilmentProviderDto {
  /** The provider key to enable */
  providerKey: string;
  /** Display name override (optional, defaults to provider's display name) */
  displayName?: string;
  /** Whether to enable immediately */
  isEnabled?: boolean;
  /** Inventory sync mode */
  inventorySyncMode?: InventorySyncMode;
  /** Configuration values (key-value pairs for API keys, etc.) */
  configuration?: Record<string, string>;
}

/** Request to update a fulfilment provider configuration */
export interface UpdateFulfilmentProviderDto {
  /** Display name override */
  displayName?: string;
  /** Whether the provider is enabled */
  isEnabled?: boolean;
  /** Inventory sync mode */
  inventorySyncMode?: InventorySyncMode;
  /** Configuration values (key-value pairs) */
  configuration?: Record<string, string>;
}

/** Request to toggle fulfilment provider enabled status */
export interface ToggleFulfilmentProviderDto {
  isEnabled: boolean;
}

// ============================================
// Test Provider DTOs
// ============================================

/** Result of testing a fulfilment provider connection */
export interface TestFulfilmentProviderResultDto {
  success: boolean;
  providerVersion?: string;
  accountName?: string;
  warehouseCount?: number;
  errorMessage?: string;
  errorCode?: string;
}

// ============================================
// Sync Log DTOs
// ============================================

/** Fulfilment sync log entry for display */
export interface FulfilmentSyncLogDto {
  id: string;
  providerConfigurationId: string;
  providerDisplayName?: string;
  syncType: FulfilmentSyncType;
  syncTypeLabel: string;
  status: FulfilmentSyncStatus;
  statusLabel: string;
  statusCssClass: string;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

/** Query parameters for sync logs */
export interface FulfilmentSyncLogQueryParams {
  providerConfigurationId?: string;
  syncType?: FulfilmentSyncType;
  status?: FulfilmentSyncStatus;
  page?: number;
  pageSize?: number;
}

/** Paged result for sync logs */
export interface FulfilmentSyncLogPageDto {
  items: FulfilmentSyncLogDto[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================
// Dropdown Selection Types
// ============================================

/** Simple provider option for dropdowns */
export interface FulfilmentProviderOptionDto {
  configurationId: string;
  displayName: string;
  providerKey: string;
  isEnabled: boolean;
}
