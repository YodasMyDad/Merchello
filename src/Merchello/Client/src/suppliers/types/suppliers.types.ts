// Supplier list item DTO
export interface SupplierListItemDto {
  id: string;
  name: string;
  code?: string;
  warehouseCount: number;
  /** The default fulfilment provider configuration ID for this supplier */
  fulfilmentProviderConfigurationId?: string;
  /** Display name of the fulfilment provider (if set) */
  fulfilmentProviderName?: string;
}

export interface EmailDeliverySettingsDto {
  recipientEmail?: string;
  ccAddresses?: string[];
}

export interface FtpDeliverySettingsDto {
  host?: string;
  port?: number;
  username?: string;
  /**
   * Leave empty when updating to preserve the currently stored password.
   */
  password?: string;
  remotePath?: string;
  useSftp: boolean;
  hostFingerprint?: string;
}

export interface CsvDeliverySettingsDto {
  columns?: Record<string, string>;
  staticColumns?: Record<string, string>;
}

export interface SupplierDirectProfileDto {
  submissionTrigger?: "OnPaid" | "ExplicitRelease" | string;
  deliveryMethod: "Email" | "Ftp" | "Sftp" | string;
  emailSettings?: EmailDeliverySettingsDto;
  ftpSettings?: FtpDeliverySettingsDto;
  csvSettings?: CsvDeliverySettingsDto;
}

export interface SupplierDetailDto extends SupplierListItemDto {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  supplierDirectProfile?: SupplierDirectProfileDto;
  dateCreated: string;
  dateUpdated: string;
}

// Create supplier DTO
export interface CreateSupplierDto {
  name: string;
  code?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  /** The default fulfilment provider configuration ID for this supplier */
  fulfilmentProviderConfigurationId?: string;
  supplierDirectProfile?: SupplierDirectProfileDto;
}

// Update supplier DTO
export interface UpdateSupplierDto {
  name: string;
  code?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  /** The default fulfilment provider configuration ID for this supplier */
  fulfilmentProviderConfigurationId?: string;
  shouldClearFulfilmentProviderId?: boolean;
  supplierDirectProfile?: SupplierDirectProfileDto;
  shouldClearSupplierDirectProfile?: boolean;
}

export interface TestSupplierFtpConnectionDto {
  supplierId?: string;
  deliveryMethod: "Ftp" | "Sftp" | string;
  ftpSettings: FtpDeliverySettingsDto;
}

export interface TestSupplierFtpConnectionResultDto {
  success: boolean;
  errorMessage?: string;
}
