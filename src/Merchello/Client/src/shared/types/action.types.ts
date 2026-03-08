export interface ActionDto {
  key: string;
  displayName: string;
  category: string;
  behavior: "serverSide" | "sidebar" | "download";
  icon?: string;
  description?: string;
  sortOrder: number;
  sidebarJsModule?: string;
  sidebarElementTag?: string;
  sidebarSize: string;
}

export interface ExecuteActionDto {
  actionKey: string;
  invoiceId?: string;
  orderId?: string;
  productRootId?: string;
  productId?: string;
  customerId?: string;
  warehouseId?: string;
  supplierId?: string;
  data?: Record<string, unknown>;
}

export interface ExecuteActionResultDto {
  success: boolean;
  message?: string;
}
