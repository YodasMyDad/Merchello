// Order and Payment types matching the API DTOs
import type { AddressDto } from "@shared/types/index.js";
export type { AddressDto };

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
  currencyCode: string;
  currencySymbol: string;
  amountInStoreCurrency?: number | null;
  settlementCurrencyCode?: string | null;
  settlementExchangeRate?: number | null;
  settlementAmount?: number | null;
  settlementExchangeRateSource?: string | null;
  paymentMethod?: string;
  paymentProviderAlias?: string;
  paymentType: PaymentType;
  transactionId?: string;
  description?: string;
  isPaymentSuccessful: boolean;
  refundReason?: string;
  parentPaymentId?: string;
  dateCreated: string;
  /** Fraud/risk score (0-100 scale). Higher = higher risk. */
  riskScore?: number | null;
  /** Source of the risk score (e.g., "stripe-radar", "signifyd") */
  riskScoreSource?: string | null;
  /** Risk level classification: "high", "medium", "low", "minimal", or null. Calculated by backend. */
  riskLevel?: string | null;
  /** Child refund payments (if any) */
  refunds?: PaymentDto[];
  /** Calculated refundable amount (original amount minus existing refunds) */
  refundableAmount: number;
  /** Whether the payment can be refunded via the original provider */
  canRefundViaProvider: boolean;
  /** Reason why provider refund is not available (when canRefundViaProvider is false) */
  cannotRefundViaProviderReason?: string | null;
  /** Whether the provider supports partial refunds (when canRefundViaProvider is true) */
  supportsPartialRefunds: boolean;
}

/** Invoice payment status response */
export interface PaymentStatusDto {
  invoiceId: string;
  currencyCode: string;
  currencySymbol: string;
  storeCurrencyCode: string;
  storeCurrencySymbol: string;
  status: InvoicePaymentStatus;
  statusDisplay: string;
  /** CSS class for payment status badge styling */
  statusCssClass: string;
  invoiceTotal: number;
  invoiceTotalInStoreCurrency?: number | null;
  totalPaid: number;
  totalPaidInStoreCurrency?: number | null;
  totalRefunded: number;
  totalRefundedInStoreCurrency?: number | null;
  netPayment: number;
  netPaymentInStoreCurrency?: number | null;
  balanceDue: number;
  balanceDueInStoreCurrency?: number | null;
  /** Maximum fraud/risk score across all payments (0-100 scale). */
  maxRiskScore?: number | null;
  /** Source of the maximum risk score. */
  maxRiskScoreSource?: string | null;
  /** Risk level classification: "high", "medium", "low", "minimal", or null. Calculated by backend. */
  riskLevel?: string | null;
  /**
   * Balance status classification: "Balanced", "Underpaid", "Overpaid".
   * Calculated by backend to avoid frontend logic duplication from comparing balanceDue values.
   */
  balanceStatus: string;
  /**
   * CSS class for balance status styling (e.g., "balanced", "underpaid", "overpaid").
   * Calculated by backend to avoid frontend logic duplication.
   */
  balanceStatusCssClass: string;
  /**
   * Display label for balance due row (e.g., "Balance Due", "Credit Due").
   * Calculated by backend to avoid frontend logic duplication.
   */
  balanceStatusLabel: string;
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

/** Request to preview a refund calculation */
export interface PreviewRefundRequestDto {
  /** Specific amount to preview refund for. If null, previews full refund. */
  amount?: number;
  /** Percentage of refundable amount (0-100). Takes precedence over amount if provided. */
  percentage?: number;
}

/** Result of a refund preview calculation */
export interface RefundPreviewDto {
  /** The payment ID being previewed */
  paymentId: string;
  /** The total refundable amount for this payment */
  refundableAmount: number;
  /** The calculated refund amount based on request (amount or percentage) */
  requestedAmount: number;
  /** The currency code for the refund amounts */
  currencyCode: string;
  /** Whether the payment provider supports partial refunds */
  supportsPartialRefund: boolean;
  /** Whether the payment provider supports refunds at all */
  supportsRefund: boolean;
  /** The payment provider alias handling this payment */
  providerAlias?: string | null;
  /** Formatted refundable amount for display */
  formattedRefundableAmount?: string | null;
  /** Formatted requested amount for display */
  formattedRequestedAmount?: string | null;
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
  /** Source type identifier (e.g., "web", "ucp", "api", "pos") */
  sourceType?: string | null;
  /** Source name/label for display (e.g., agent name, API key name) */
  sourceName?: string | null;
  currencyCode: string;
  currencySymbol: string;
  storeCurrencyCode: string;
  storeCurrencySymbol: string;
  total: number;
  totalInStoreCurrency?: number | null;
  isMultiCurrency: boolean;
  paymentStatus: InvoicePaymentStatus;
  paymentStatusDisplay: string;
  paymentStatusCssClass: string;
  fulfillmentStatus: string;
  fulfillmentStatusCssClass: string;
  isCancelled: boolean;
  itemCount: number;
  deliveryStatus: string;
  /** Due date for payment (null = due immediately) */
  dueDate?: string | null;
  /** Whether this invoice is overdue (calculated from DueDate) */
  isOverdue?: boolean;
  /** Days until due (negative if overdue) */
  daysUntilDue?: number | null;
  /** Outstanding balance due on this invoice */
  balanceDue?: number;
}

/** Invoice source tracking for analytics and auditing */
export interface InvoiceSourceDto {
  /** Source type identifier (e.g., "web", "ucp", "api", "pos") */
  type: string;
  /** Human-readable display name for the source */
  displayName?: string | null;
  /** Unique identifier for the source instance (e.g., agent ID, API key ID) */
  sourceId?: string | null;
  /** Name/label for the source instance */
  sourceName?: string | null;
  /** Protocol version if applicable (e.g., UCP version) */
  protocolVersion?: string | null;
  /** Session/transaction ID from the source system */
  sessionId?: string | null;
}

export interface OrderDetailDto {
  id: string;
  customerId: string;
  invoiceNumber: string;
  dateCreated: string;
  channel: string;
  purchaseOrder: string | null;
  /** Source tracking information for analytics and auditing */
  source?: InvoiceSourceDto | null;
  currencyCode: string;
  currencySymbol: string;
  storeCurrencyCode: string;
  storeCurrencySymbol: string;
  pricingExchangeRate?: number | null;
  pricingExchangeRateSource?: string | null;
  pricingExchangeRateTimestampUtc?: string | null;
  subTotal: number;
  /** Total discount amount (always positive) */
  discountTotal: number;
  /** Individual discount line items for display */
  discounts: DiscountLineItemDto[];
  shippingCost: number;
  tax: number;
  total: number;
  subTotalInStoreCurrency?: number | null;
  discountTotalInStoreCurrency?: number | null;
  shippingCostInStoreCurrency?: number | null;
  taxInStoreCurrency?: number | null;
  totalInStoreCurrency?: number | null;
  amountPaid: number;
  balanceDue: number;
  amountPaidInStoreCurrency?: number | null;
  balanceDueInStoreCurrency?: number | null;
  /**
   * Balance status classification: "Balanced", "Underpaid", "Overpaid".
   * Calculated by backend to avoid frontend logic duplication from comparing balanceDue values.
   */
  balanceStatus: string;
  /**
   * CSS class for balance status styling (e.g., "balanced", "underpaid", "overpaid").
   * Calculated by backend to avoid frontend logic duplication.
   */
  balanceStatusCssClass: string;
  /**
   * Display label for balance due row (e.g., "Balance Due", "Credit Due").
   * Calculated by backend to avoid frontend logic duplication.
   */
  balanceStatusLabel: string;
  paymentStatus: InvoicePaymentStatus;
  paymentStatusDisplay: string;
  paymentStatusCssClass: string;
  /** Maximum fraud/risk score across all payments (0-100 scale). */
  maxRiskScore?: number | null;
  /** Source of the maximum risk score. */
  maxRiskScoreSource?: string | null;
  fulfillmentStatus: string;
  /**
   * CSS class for fulfillment status styling (e.g., "unfulfilled", "partial", "fulfilled").
   * Calculated by backend to avoid frontend logic duplication.
   */
  fulfillmentStatusCssClass: string;
  isCancelled: boolean;
  billingAddress: AddressDto | null;
  shippingAddress: AddressDto | null;
  orders: FulfillmentOrderDto[];
  notes: InvoiceNoteDto[];
  /**
   * Total number of items in the order (sum of line item quantities).
   * Calculated by backend to avoid frontend logic duplication.
   */
  itemCount: number;
  customerOrderCount: number;
  /**
   * Whether the invoice can be fulfilled (has unfulfilled items and is not cancelled).
   * Calculated by backend to avoid frontend logic duplication.
   */
  canFulfill: boolean;
}

export interface FulfillmentOrderDto {
  id: string;
  status: OrderStatus;
  /** Human-readable status label (e.g., "Pending", "Shipped"). Calculated by backend. */
  statusLabel: string;
  /** CSS class for status badge styling. Calculated by backend. */
  statusCssClass: string;
  lineItems: LineItemDto[];
  shipments: ShipmentDto[];
  deliveryMethod: string;
  shippingCost: number;

  // Fulfilment Provider Information

  /** Provider key (e.g., "shipbob", "shipmonk"). Null if manual fulfilment. */
  fulfilmentProviderKey: string | null;
  /** Provider display name (e.g., "ShipBob", "ShipMonk"). Null if manual fulfilment. */
  fulfilmentProviderName: string | null;
  /** 3PL's order reference (e.g., "SB-12345"). Null if not yet submitted or manual fulfilment. */
  fulfilmentProviderReference: string | null;
  /** When the order was submitted to the fulfilment provider (ISO 8601). */
  fulfilmentSubmittedAt: string | null;
  /** Error message if fulfilment submission failed. */
  fulfilmentErrorMessage: string | null;
  /** Number of fulfilment submission retry attempts. */
  fulfilmentRetryCount: number;
  /** Supplier Direct trigger mode ("OnPaid" | "ExplicitRelease"), null for non-Supplier Direct orders. */
  supplierDirectSubmissionTrigger: string | null;
  /** Whether this order can be explicitly released to Supplier Direct right now. */
  canReleaseSupplierDirect: boolean;
}

/** Selected product option for display (e.g., Color: Grey) */
export interface SelectedOptionDto {
  optionName: string;
  valueName: string;
}

export interface LineItemDto {
  id: string;
  sku: string | null;
  /** Variant name (e.g., "S-Grey"). For display, prefer productRootName with selectedOptions. */
  name: string | null;
  /** Root product name (e.g., "Premium V-Neck") */
  productRootName: string;
  /** Selected options for this variant (e.g., Color: Grey, Size: S) */
  selectedOptions: SelectedOptionDto[];
  quantity: number;
  amount: number;
  originalAmount: number | null;
  imageUrl: string | null;
  /** Backend-calculated total for this line item */
  calculatedTotal: number;
  /** The line item type (e.g., "Product", "Custom", "Addon"). */
  lineItemType: string;
  /** Child add-on line items linked to this parent product/custom item. */
  childLineItems: LineItemDto[];
  /** The parent line item SKU if this is a child add-on item. */
  parentLineItemSku: string | null;
  /** The parent line item ID if this is a child add-on item. */
  parentLineItemId: string | null;
  /** Whether this line item represents an add-on (non-variant option value). */
  isAddon: boolean;
}

export interface ShipmentDto {
  id: string;
  status: number;
  statusLabel: string;
  statusCssClass: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  shippedDate: string | null;
  actualDeliveryDate: string | null;
}

export interface InvoiceNoteDto {
  date: string;
  text: string;
  authorId: string | null;
  author: string | null;
  isVisibleToCustomer: boolean;
}

/** Request to add a note to an invoice */
export interface AddInvoiceNoteDto {
  text: string;
  isVisibleToCustomer: boolean;
}

export interface OrderPageDto {
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
  /** Total outstanding value across all unpaid invoices */
  totalOutstandingValue: number;
  /** Number of outstanding (unpaid) invoices */
  outstandingInvoiceCount: number;
  /** Number of overdue invoices */
  overdueInvoiceCount: number;
  /** Currency code for the outstanding values */
  currencyCode: string;
}

export interface DashboardStatsDto {
  storeCurrencyCode: string;
  storeCurrencySymbol: string;
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
  cancellationStatus?: string;
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

// ============================================
// Fulfillment Types
// ============================================

/** Request to create a new shipment */
export interface CreateShipmentDto {
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
export interface UpdateShipmentDto {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  actualDeliveryDate?: string;
}

/** Shipment status enum values matching backend */
export enum ShipmentStatus {
  Preparing = 0,
  Shipped = 10,
  Delivered = 20,
  Cancelled = 30,
}

/** Request to update shipment status */
export interface UpdateShipmentStatusDto {
  newStatus: ShipmentStatus;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

/** Result returned when explicitly releasing an order to Supplier Direct fulfilment. */
export interface ReleaseFulfillmentResultDto {
  orderId: string;
  released: boolean;
  alreadyReleased: boolean;
  message: string;
  fulfilmentProviderReference?: string | null;
}

/** Summary of fulfillment state for the entire invoice (used in fulfillment dialog) */
export interface FulfillmentSummaryDto {
  invoiceId: string;
  invoiceNumber: string;
  overallStatus: "Unfulfilled" | "Partial" | "Fulfilled";
  overallStatusCssClass: string;
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
  /** Variant name (e.g., "S-Grey"). For display, prefer productRootName with selectedOptions. */
  name: string | null;
  /** Root product name (e.g., "Premium V-Neck") */
  productRootName: string;
  /** Selected options for this variant (e.g., Color: Grey, Size: S) */
  selectedOptions: SelectedOptionDto[];
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
  /** Current status of the shipment */
  status: ShipmentStatus;
  /** Human-readable status label (e.g., "Preparing", "Shipped") */
  statusLabel: string;
  /** CSS class for status badge styling */
  statusCssClass: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  dateCreated: string;
  /** Date the shipment was handed to the carrier */
  shippedDate: string | null;
  actualDeliveryDate: string | null;
  lineItems: ShipmentLineItemDto[];
  /** Whether the shipment can be marked as shipped (status is Preparing) */
  canMarkAsShipped: boolean;
  /** Whether the shipment can be marked as delivered (status is Shipped) */
  canMarkAsDelivered: boolean;
  /** Whether the shipment can be cancelled (not in terminal state) */
  canCancel: boolean;
}

/** Line item within a shipment */
export interface ShipmentLineItemDto {
  id: string;
  lineItemId: string;
  sku: string | null;
  /** Variant name (e.g., "S-Grey"). For display, prefer productRootName with selectedOptions. */
  name: string | null;
  /** Root product name (e.g., "Premium V-Neck") */
  productRootName: string;
  /** Selected options for this variant (e.g., Color: Grey, Size: S) */
  selectedOptions: SelectedOptionDto[];
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
export interface ExportOrderDto {
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
  currencyCode: string;
  storeCurrencyCode: string;
  subTotalInStoreCurrency: number | null;
  taxInStoreCurrency: number | null;
  shippingInStoreCurrency: number | null;
  totalInStoreCurrency: number | null;
}

// ============================================
// Invoice Edit Types
// ============================================

/** Discount value type enum */
export enum DiscountValueType {
  FixedAmount = 0,
  Percentage = 1,
  Free = 2,
}

/** Invoice data for editing */
export interface InvoiceForEditDto {
  id: string;
  invoiceNumber: string;
  fulfillmentStatus: string;
  /**
   * CSS class for fulfillment status styling (e.g., "unfulfilled", "partial", "fulfilled").
   * Calculated by backend to avoid frontend logic duplication.
   */
  fulfillmentStatusCssClass: string;
  canEdit: boolean;
  cannotEditReason: string | null;
  currencySymbol: string;
  currencyCode: string;
  orders: OrderForEditDto[];
  /** Order-level discounts (coupons, etc.) - can be viewed and removed */
  orderDiscounts: DiscountLineItemDto[];
  /** Shipping address country code (for region validation when adding products) */
  shippingCountryCode: string | null;
  /** Shipping address region/state code (for region validation when adding products) */
  shippingRegion: string | null;
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
  /** Variant name (e.g., "S-Grey"). For display, prefer productRootName with selectedOptions. */
  name: string | null;
  /** Root product name (e.g., "Premium V-Neck") */
  productRootName: string;
  /** Selected options for this variant (e.g., Color: Grey, Size: S) */
  selectedOptions: SelectedOptionDto[];
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
  /** Child add-on line items linked to this parent product */
  childLineItems: LineItemForEditDto[];
  /** The parent line item SKU if this is a child add-on item */
  parentLineItemSku: string | null;
  /** Whether this line item represents an add-on (non-variant option value) */
  isAddon: boolean;
}

/** Discount line item */
export interface DiscountLineItemDto {
  id: string;
  name: string | null;
  /** The calculated discount amount (always positive) */
  amount: number;
  /** The original discount value type (FixedAmount, Percentage, or Free) */
  type: DiscountValueType;
  /** The original discount value (e.g., 10 for £10 off or 10%) */
  value: number;
  reason: string | null;
  isVisibleToCustomer: boolean;
}

/** Request to edit an invoice */
export interface EditInvoiceDto {
  lineItems: EditLineItemDto[];
  removedLineItems: RemoveLineItemDto[];
  /** IDs of order-level discounts to remove (coupons, etc.) */
  removedOrderDiscounts: string[];
  customItems: AddCustomItemDto[];
  /** Products to add (with optional add-ons) */
  productsToAdd?: AddProductToOrderDto[];
  /** Order-level discounts to add (not tied to specific line items) */
  orderDiscounts?: LineItemDiscountDto[];
  /** Promotional discount codes to apply via checkout discount logic */
  orderDiscountCodes?: string[];
  orderShippingUpdates: OrderShippingUpdateDto[];
  editReason: string | null;
  /** If true, removes tax from all line items (VAT exemption) */
  shouldRemoveTax: boolean;
}

/** Request to add a product (variant) to an order, with optional add-on selections */
export interface AddProductToOrderDto {
  /** The product variant ID */
  productId: string;
  /** Quantity to add */
  quantity: number;
  /** The warehouse that will fulfill this product */
  warehouseId: string;
  /** The shipping option for this product */
  shippingOptionId: string;
  /**
   * Optional selection key (supports dynamic providers).
   * Format: "so:{guid}" or "dyn:{provider}:{serviceCode}".
   */
  selectionKey?: string | null;
  /** Selected add-on options (non-variant product options) */
  addons: OrderAddonDto[];
}

/** A selected add-on option value for a product */
export interface OrderAddonDto {
  /** The option ID (ProductOption.Id) */
  optionId: string;
  /** The option value ID (ProductOptionValue.Id) */
  optionValueId: string;
  /** Display name for the add-on (e.g., "Gift Wrap: Premium") */
  name: string;
  /** Price adjustment to add to the base product price */
  priceAdjustment: number;
  /** Cost adjustment for this add-on (for profit calculations) */
  costAdjustment: number;
  /** SKU suffix to append to the parent product SKU */
  skuSuffix: string | null;
}

/** A custom add-on attached to a custom line item */
export interface CustomItemAddonDto {
  /** Add-on key/name (e.g., "Drawers") */
  key: string;
  /** Add-on value (e.g., "Left side") */
  value: string;
  /** Price adjustment per unit to add to the parent custom item */
  priceAdjustment: number;
  /** Cost adjustment per unit for profit calculations */
  costAdjustment: number;
  /** Optional SKU suffix to append to the parent SKU */
  skuSuffix: string | null;
}

/** Line item removal with return-to-stock option */
export interface RemoveLineItemDto {
  id: string;
  /** Whether to return the item to available stock (default: true). False for damaged/faulty items. */
  shouldReturnToStock: boolean;
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
  shouldReturnToStock: boolean;
  discount: LineItemDiscountDto | null;
}

/** Discount to apply to a line item */
export interface LineItemDiscountDto {
  /** Display label shown in order summaries and discount rows */
  displayName: string | null;
  type: DiscountValueType;
  value: number;
  reason: string | null;
  isVisibleToCustomer: boolean;
}


/** Custom item to add to the invoice */
export interface AddCustomItemDto {
  name: string;
  /** SKU for the custom item */
  sku: string;
  /** Unit price (selling price) */
  price: number;
  /** Unit cost (for profit/loss calculations) */
  cost: number;
  quantity: number;
  /** Tax group ID. If null/undefined, item is not taxable */
  taxGroupId: string | null;
  isPhysicalProduct: boolean;
  /** Warehouse ID for physical products */
  warehouseId?: string | null;
  /** Shipping option ID for physical products (null means no shipping) */
  shippingOptionId?: string | null;
  /** Optional custom add-ons attached to this item */
  addons: CustomItemAddonDto[];
}

/** Product variant result used by custom item autocomplete in order edit */
export interface OrderProductAutocompleteDto {
  /** Variant ID */
  id: string;
  /** Product root ID */
  productRootId: string;
  /** Product root name */
  rootName: string;
  /** Variant name */
  name: string;
  /** Variant SKU */
  sku: string | null;
  /** Variant price */
  price: number;
  /** Variant cost of goods */
  cost: number;
  /** Product root tax group ID */
  taxGroupId: string | null;
  /** Whether this item should be treated as physical in order edit */
  isPhysicalProduct: boolean;
  /** Variant image URL (falls back to root image) */
  imageUrl: string | null;
}

/** Tax group data for dropdowns */
export interface TaxGroupDto {
  id: string;
  name: string;
  taxPercentage: number;
}

/** Response after editing an invoice */
export interface EditInvoiceResultDto {
  isSuccessful: boolean;
  errorMessage: string | null;
  /** Warning messages (stock issues, etc.) - edit succeeded but user should be notified */
  warnings: string[];
}

// ============================================
// Preview Edit Types (Single Source of Truth)
// ============================================

/**
 * Result of previewing invoice edit calculations.
 * All calculations are performed server-side - this is the single source of truth.
 */
export interface PreviewEditResultDto {
  currencyCode: string;
  currencySymbol: string;
  storeCurrencyCode: string;
  storeCurrencySymbol: string;
  pricingExchangeRate?: number | null;
  /** Subtotal before discounts (products + custom items) */
  subTotal: number;
  /** Total discount amount (always positive) */
  discountTotal: number;
  /** Subtotal after discounts (SubTotal - DiscountTotal) */
  adjustedSubTotal: number;
  /** Total shipping cost across all orders */
  shippingTotal: number;
  /** Tax amount calculated on discounted amounts */
  tax: number;
  /** Grand total (AdjustedSubTotal + Tax + ShippingTotal) */
  total: number;
  totalInStoreCurrency?: number | null;
  /** Per-line-item calculated totals for display */
  lineItems: LineItemPreviewDto[];
  /** Validation warnings (e.g., discount exceeds item value) */
  warnings: string[];
}

/** Calculated values for a single line item */
export interface LineItemPreviewDto {
  /** Line item ID */
  id: string;
  /** Calculated total for this line item (amount * quantity - discount) */
  calculatedTotal: number;
  /** Discounted unit price (original price - per-unit discount) */
  discountedUnitPrice: number;
  /** Calculated discount amount for this line item */
  discountAmount: number;
  /** Tax amount for this line item */
  taxAmount: number;
  /**
   * Whether the requested quantity increase exceeds available stock.
   * Calculated by backend based on current stock levels and tracking settings.
   * Frontend should use this instead of local stock validation logic.
   */
  hasInsufficientStock: boolean;
  /**
   * Whether a discount can be added to this line item.
   * Backend determines this based on business rules (e.g., original discount was removed).
   * Frontend should use this instead of local canModifyDiscount logic.
   */
  canAddDiscount: boolean;
}

// ============================================
// Discount Preview Types
// ============================================

/** Request DTO for previewing discount calculation on a line item */
export interface PreviewDiscountRequestDto {
  /** Unit price of the line item */
  lineItemPrice: number;
  /** Quantity of items */
  quantity: number;
  /** Type of discount (FixedAmount or Percentage) */
  discountType: DiscountValueType;
  /** Discount value (amount for fixed, percentage for percentage type) */
  discountValue: number;
  /** Currency code for proper rounding (e.g., "GBP", "USD", "JPY"). If not provided, defaults to store currency. */
  currencyCode?: string;
}

/** Result DTO for discount preview calculation */
export interface PreviewDiscountResultDto {
  /** Line total before discount (price * quantity) */
  lineTotal: number;
  /** Calculated discount amount (always positive) */
  discountAmount: number;
  /** Total after discount applied */
  discountedTotal: number;
}

// ============================================
// Create Order Types
// ============================================

/** Request to create a manual order from the admin backoffice */
export interface CreateManualOrderDto {
  /** Billing address for the order (required) */
  billingAddress: AddressDto;
  /** Shipping address for the order. If null, billing address is used. */
  shippingAddress?: AddressDto | null;
  /** Custom items to add to the order */
  customItems: AddCustomItemDto[];
}

/** Result DTO returned after creating a manual order */
export interface CreateManualOrderResultDto {
  /** Whether the manual order was created successfully */
  isSuccessful: boolean;
  /** The ID of the created invoice (if successful) */
  invoiceId?: string;
  /** The invoice number of the created order (if successful) */
  invoiceNumber?: string;
  /** Error message if creation failed */
  errorMessage?: string;
}

/** Result DTO for customer lookup, containing customer info and their past shipping addresses */
export interface CustomerLookupResultDto {
  /** Customer ID if this is a registered customer, null for guests */
  customerId: string | null;
  /** Customer name from billing address */
  name: string;
  /** Customer email from billing address */
  email: string;
  /** Customer phone from billing address */
  phone?: string;
  /** The most recent billing address for this customer */
  billingAddress: AddressDto;
  /** De-duplicated list of past shipping addresses from this customer's orders */
  pastShippingAddresses: AddressDto[];
  /** Whether the customer has account terms enabled */
  hasAccountTerms: boolean;
  /** Optional credit limit for account customers */
  creditLimit: number | null;
}

// ============================================
// Order Table Column Types
// ============================================

/**
 * Available columns for the order table component.
 * 'invoiceNumber' is always shown regardless of configuration.
 */
export type OrderColumnKey =
  | "select" // Checkbox for multi-select
  | "invoiceNumber" // Order/invoice number (always shown)
  | "date" // Date created
  | "customer" // Customer name
  | "channel" // Sales channel
  | "total" // Order total
  | "paymentStatus" // Payment status badge
  | "fulfillmentStatus" // Fulfillment status badge
  | "itemCount"; // Number of items

/** Column header labels */
export const ORDER_COLUMN_LABELS: Record<OrderColumnKey, string> = {
  select: "",
  invoiceNumber: "Order",
  date: "Date",
  customer: "Customer",
  channel: "Channel",
  total: "Total",
  paymentStatus: "Payment",
  fulfillmentStatus: "Fulfillment",
  itemCount: "Items",
};

/** Default columns for a full order list */
export const DEFAULT_ORDER_COLUMNS: OrderColumnKey[] = [
  "invoiceNumber",
  "date",
  "customer",
  "total",
  "paymentStatus",
  "fulfillmentStatus",
];

/** Compact columns for modals/previews */
export const COMPACT_ORDER_COLUMNS: OrderColumnKey[] = [
  "invoiceNumber",
  "date",
  "total",
  "paymentStatus",
  "fulfillmentStatus",
  "itemCount",
];

// ============================================
// Order Table Event Types
// ============================================

/** Event detail for order click */
export interface OrderClickEventDetail {
  orderId: string;
  order: OrderListItemDto;
}

/** Event detail for selection change */
export interface OrderSelectionChangeEventDetail {
  selectedIds: string[];
}
