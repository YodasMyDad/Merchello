// Email configuration list item DTO
export interface EmailConfigurationDto {
  id: string;
  name: string;
  topic: string;
  topicDisplayName: string | null;
  topicCategory: string | null;
  enabled: boolean;
  templatePath: string;
  toExpression: string;
  subjectExpression: string;
  description: string | null;
  dateCreated: string;
  dateModified: string;
  totalSent: number;
  totalFailed: number;
  lastSentUtc: string | null;
  attachmentAliases: string[];
}

// Email configuration detail DTO (includes CC/BCC/From)
export interface EmailConfigurationDetailDto extends EmailConfigurationDto {
  ccExpression: string | null;
  bccExpression: string | null;
  fromExpression: string | null;
}

// Create email configuration DTO
export interface CreateEmailConfigurationDto {
  name: string;
  topic: string;
  templatePath: string;
  toExpression: string;
  subjectExpression: string;
  enabled?: boolean;
  ccExpression?: string | null;
  bccExpression?: string | null;
  fromExpression?: string | null;
  description?: string | null;
  attachmentAliases?: string[];
}

// Update email configuration DTO
export interface UpdateEmailConfigurationDto {
  name: string;
  topic: string;
  templatePath: string;
  toExpression: string;
  subjectExpression: string;
  enabled: boolean;
  ccExpression?: string | null;
  bccExpression?: string | null;
  fromExpression?: string | null;
  description?: string | null;
  attachmentAliases?: string[];
}

// Send test email DTO
export interface SendTestEmailDto {
  recipient: string;
}

// Paginated response for email configurations
export interface EmailConfigurationPageDto {
  items: EmailConfigurationDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// Query parameters for email configuration list
export interface EmailConfigurationListParams {
  topic?: string;
  category?: string;
  enabled?: boolean;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
}

// Token information DTO
export interface TokenInfoDto {
  path: string;
  displayName: string;
  description: string | null;
  dataType: string;
}

// Email topic DTO
export interface EmailTopicDto {
  topic: string;
  displayName: string;
  description: string | null;
  category: string;
  availableTokens: TokenInfoDto[];
}

// Email topic category DTO
export interface EmailTopicCategoryDto {
  category: string;
  topics: EmailTopicDto[];
}

// Email template DTO
export interface EmailTemplateDto {
  path: string;
  displayName: string;
  fullPath: string | null;
  lastModified: string;
}

// Email preview DTO
export interface EmailPreviewDto {
  to: string;
  cc: string | null;
  bcc: string | null;
  from: string;
  subject: string;
  body: string;
  success: boolean;
  errorMessage: string | null;
  warnings: string[];
}

// Email send test result DTO
export interface EmailSendTestResultDto {
  success: boolean;
  recipient: string | null;
  errorMessage: string | null;
  deliveryId: string | null;
}

// Email attachment DTO
export interface EmailAttachmentDto {
  alias: string;
  displayName: string;
  description: string | null;
  iconSvg: string | null;
  topic: string;
}
