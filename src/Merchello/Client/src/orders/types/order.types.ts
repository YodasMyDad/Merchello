// Order and Payment types matching the API DTOs

// ============================================
// Payment Types
// ============================================

/** Payment type enum */
export enum PaymentType {
  Payment = 0,
  Refund = 10,
  PartialRefund = 20,
}

/** Invoice payment status enum */
export enum InvoicePaymentStatus {
  Unpaid = 0,
  AwaitingPayment = 10,
  PartiallyPaid = 20,
  Paid = 30,
  PartiallyRefunded = 40,
  Refunded = 50,
}

/** Payment record DTO */
export interface PaymentDto {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod?: string;
  paymentProviderAlias?: string;
  paymentType: PaymentType;
  transactionId?: string;
  description?: string;
  paymentSuccess: boolean;
  refundReason?: string;
  parentPaymentId?: string;
  dateCreated: string;
  /** Child refund payments (if any) */
  refunds?: PaymentDto[];
  /** Calculated refundable amount (original amount minus existing refunds) */
  refundableAmount: number;
}

/** Invoice payment status response */
export interface PaymentStatusDto {
  invoiceId: string;
  status: InvoicePaymentStatus;
  statusDisplay: string;
  invoiceTotal: number;
  totalPaid: number;
  totalRefunded: number;
  netPayment: number;
  balanceDue: number;
}

/** Request to record a manual/offline payment */
export interface RecordManualPaymentDto {
  /** Payment amount */
  amount: number;
  /** Payment method description (e.g., "Cash", "Check", "Bank Transfer") */
  paymentMethod: string;
  /** Optional description/notes */
  description?: string;
}

/** Request to process a refund */
export interface ProcessRefundDto {
  /** Amount to refund. If null or 0, refunds the full refundable amount. */
  amount?: number;
  /** Reason for the refund (required) */
  reason: string;
  /** If true, records a manual refund without calling the provider. */
  isManualRefund?: boolean;
}

/** Custom event detail for payment-recorded event */
export interface PaymentRecordedDetail {
  invoiceId: string;
}

/** Custom event detail for refund-processed event */
export interface RefundProcessedDetail {
  invoiceId: string;
}

// ============================================
// Order Types
// ============================================

export interface OrderListItemDto {
  id: string;
  invoiceNumber: string;
  dateCreated: string;
  customerName: string;
  channel: string;
  total: number;
  paymentStatus: InvoicePaymentStatus;
  paymentStatusDisplay: string;
  fulfillmentStatus: string;
  itemCount: number;
  deliveryStatus: string;
  deliveryMethod: string;
  tags: string[];
}

export interface OrderDetailDto {
  id: string;
  invoiceNumber: string;
  dateCreated: string;
  channel: string;
  subTotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: InvoicePaymentStatus;
  paymentStatusDisplay: string;
  fulfillmentStatus: string;
  billingAddress: AddressDto | null;
  shippingAddress: AddressDto | null;
  orders: FulfillmentOrderDto[];
  notes: InvoiceNoteDto[];
  customerOrderCount: number;
}

export interface AddressDto {
  name: string | null;
  company: string | null;
  addressOne: string | null;
  addressTwo: string | null;
  townCity: string | null;
  countyState: string | null;
  postalCode: string | null;
  country: string | null;
  countryCode: string | null;
  email: string | null;
  phone: string | null;
}

export interface FulfillmentOrderDto {
  id: string;
  status: OrderStatus;
  lineItems: LineItemDto[];
  shipments: ShipmentDto[];
  deliveryMethod: string;
  shippingCost: number;
}

export interface LineItemDto {
  id: string;
  sku: string | null;
  name: string | null;
  quantity: number;
  amount: number;
  originalAmount: number | null;
  imageUrl: string | null;
}

export interface ShipmentDto {
  id: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  actualDeliveryDate: string | null;
}

export interface InvoiceNoteDto {
  date: string;
  text: string;
  authorId: string | null;
  author: string | null;
  visibleToCustomer: boolean;
}

/** Request to add a note to an invoice */
export interface AddInvoiceNoteRequest {
  text: string;
  visibleToCustomer: boolean;
}

export interface OrderListResponse {
  items: OrderListItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface OrderStatsDto {
  ordersToday: number;
  itemsOrderedToday: number;
  ordersFulfilledToday: number;
  ordersDeliveredToday: number;
}

export interface DashboardStatsDto {
  ordersThisMonth: number;
  ordersChangePercent: number;
  revenueThisMonth: number;
  revenueChangePercent: number;
  productCount: number;
  productCountChange: number;
  customerCount: number;
  customerCountChange: number;
}

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}

export enum OrderStatus {
  Pending = 0,
  AwaitingStock = 10,
  ReadyToFulfill = 20,
  Processing = 30,
  PartiallyShipped = 40,
  Shipped = 50,
  Completed = 60,
  Cancelled = 70,
  OnHold = 80,
}

// Entity types for workspace routing
export const MERCHELLO_ORDERS_ENTITY_TYPE = "merchello-orders";
export const MERCHELLO_ORDER_ENTITY_TYPE = "merchello-order";

// ============================================
// Fulfillment Types
// ============================================

/** Request to create a new shipment */
export interface CreateShipmentRequest {
  /** Line items to include in shipment. Key: LineItemId, Value: Quantity */
  lineItems: Record<string, number>;
  /** Carrier name (e.g., "UPS", "FedEx", "DHL") */
  carrier?: string;
  /** Tracking number for the shipment */
  trackingNumber?: string;
  /** URL to track the shipment */
  trackingUrl?: string;
}

/** Request to update shipment tracking info */
export interface UpdateShipmentRequest {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  actualDeliveryDate?: string;
}

/** Summary of fulfillment state for the entire invoice (used in fulfillment dialog) */
export interface FulfillmentSummaryDto {
  invoiceId: string;
  invoiceNumber: string;
  overallStatus: "Unfulfilled" | "Partial" | "Fulfilled";
  orders: OrderFulfillmentDto[];
}

/** Order fulfillment state showing shipped vs unshipped items */
export interface OrderFulfillmentDto {
  orderId: string;
  warehouseId: string;
  warehouseName: string;
  status: OrderStatus;
  deliveryMethod: string;
  lineItems: FulfillmentLineItemDto[];
  shipments: ShipmentDetailDto[];
}

/** Line item with fulfillment quantities */
export interface FulfillmentLineItemDto {
  id: string;
  sku: string | null;
  name: string | null;
  orderedQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
  imageUrl: string | null;
  amount: number;
}

/** Full shipment details for display */
export interface ShipmentDetailDto {
  id: string;
  orderId: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  dateCreated: string;
  actualDeliveryDate: string | null;
  lineItems: ShipmentLineItemDto[];
}

/** Line item within a shipment */
export interface ShipmentLineItemDto {
  id: string;
  lineItemId: string;
  sku: string | null;
  name: string | null;
  quantity: number;
  imageUrl: string | null;
}

/** For tracking items being added to a new shipment in the UI */
export interface PendingShipmentItem {
  lineItemId: string;
  name: string;
  sku: string | null;
  quantity: number;
  maxQuantity: number;
  imageUrl: string | null;
}

// ============================================
// Export Types
// ============================================

/** Request to export orders within a date range */
export interface OrderExportRequest {
  fromDate: string;
  toDate: string;
}

/** Order export item for CSV generation */
export interface OrderExportItemDto {
  invoiceNumber: string;
  invoiceDate: string;
  paymentStatus: string;
  billingName: string;
  subTotal: number;
  tax: number;
  shipping: number;
  total: number;
}

// ============================================
// Invoice Edit Types
// ============================================

/** Discount type enum */
export enum DiscountType {
  Amount = 0,
  Percentage = 1,
}

/** Invoice data for editing */
export interface InvoiceForEditDto {
  id: string;
  invoiceNumber: string;
  fulfillmentStatus: string;
  canEdit: boolean;
  cannotEditReason: string | null;
  currencySymbol: string;
  currencyCode: string;
  orders: OrderForEditDto[];
  /** Subtotal before discounts (products + custom items) */
  subTotal: number;
  /** Total discount amount (always positive) */
  discountTotal: number;
  /** Subtotal after discounts (SubTotal - DiscountTotal) */
  adjustedSubTotal: number;
  /** Total shipping cost across all orders */
  shippingTotal: number;
  /** Tax amount */
  tax: number;
  /** Grand total */
  total: number;
}

/** Order data for editing */
export interface OrderForEditDto {
  id: string;
  status: string;
  shippingCost: number;
  shippingMethodName: string | null;
  lineItems: LineItemForEditDto[];
}

/** Line item data for editing */
export interface LineItemForEditDto {
  id: string;
  orderId: string;
  sku: string | null;
  name: string | null;
  productId: string | null;
  quantity: number;
  amount: number;
  originalAmount: number | null;
  imageUrl: string | null;
  isTaxable: boolean;
  taxRate: number;
  lineItemType: string;
  /** Whether stock is tracked for this product */
  isStockTracked: boolean;
  /** Available stock (current - reserved) for quantity increase validation */
  availableStock: number | null;
  discounts: DiscountLineItemDto[];
}

/** Discount line item */
export interface DiscountLineItemDto {
  id: string;
  name: string | null;
  amount: number;
  reason: string | null;
  visibleToCustomer: boolean;
}

/** Request to edit an invoice */
export interface EditInvoiceRequestDto {
  lineItems: EditLineItemDto[];
  removedLineItems: RemoveLineItemDto[];
  customItems: AddCustomItemDto[];
  orderShippingUpdates: OrderShippingUpdateDto[];
  editReason: string | null;
}

/** Line item removal with return-to-stock option */
export interface RemoveLineItemDto {
  id: string;
  /** Whether to return the item to available stock (default: true). False for damaged/faulty items. */
  returnToStock: boolean;
}

/** Per-order shipping cost update */
export interface OrderShippingUpdateDto {
  orderId: string;
  shippingCost: number;
}

/** Edit details for an existing line item */
export interface EditLineItemDto {
  id: string;
  quantity: number | null;
  /** When quantity decreased, whether to return reduced qty to stock. Default: true. */
  returnToStock: boolean;
  discount: LineItemDiscountDto | null;
}

/** Discount to apply to a line item */
export interface LineItemDiscountDto {
  type: DiscountType;
  value: number;
  reason: string | null;
  visibleToCustomer: boolean;
}

/** Custom item to add to the invoice */
export interface AddCustomItemDto {
  name: string;
  price: number;
  quantity: number;
  /** Tax group ID. If null/undefined, item is not taxable */
  taxGroupId: string | null;
  isPhysicalProduct: boolean;
}

/** Tax group data for dropdowns */
export interface TaxGroupDto {
  id: string;
  name: string;
  taxPercentage: number;
}

/** Response after editing an invoice */
export interface EditInvoiceResultDto {
  success: boolean;
  errorMessage: string | null;
  /** Warning messages (stock issues, etc.) - edit succeeded but user should be notified */
  warnings: string[];
}