export interface HealthCheckMetadataDto {
  alias: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
}

export interface HealthCheckResultDto {
  alias: string;
  name: string;
  description: string;
  icon: string;
  status: "success" | "warning" | "error";
  summary: string;
  affectedCount: number;
}

export interface HealthCheckDetailPageDto {
  items: HealthCheckDetailItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface HealthCheckDetailItemDto {
  id: string;
  name: string;
  description: string | null;
  editPath: string | null;
  imageUrl: string | null;
}

export interface HealthCheckDetailModalData {
  alias: string;
  name: string;
  description: string;
  icon: string;
}

export interface HealthCheckDetailModalValue {
  refreshed: boolean;
}
