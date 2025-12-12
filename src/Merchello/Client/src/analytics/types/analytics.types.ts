export interface AnalyticsSummaryDto {
  grossSales: number;
  grossSalesChange: number;
  returningCustomerRate: number;
  returningCustomerRateChange: number;
  ordersFulfilled: number;
  ordersFulfilledChange: number;
  totalOrders: number;
  totalOrdersChange: number;
  grossSalesSparkline: number[];
  returningCustomerSparkline: number[];
  ordersFulfilledSparkline: number[];
  totalOrdersSparkline: number[];
}

export interface TimeSeriesDataPointDto {
  date: string;
  value: number;
  comparisonValue: number | null;
}

export interface SalesBreakdownDto {
  grossSales: number;
  grossSalesChange: number;
  discounts: number;
  discountsChange: number;
  returns: number;
  returnsChange: number;
  netSales: number;
  netSalesChange: number;
  shippingCharges: number;
  shippingChargesChange: number;
  returnFees: number;
  returnFeesChange: number;
  taxes: number;
  taxesChange: number;
  totalSales: number;
  totalSalesChange: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export type DateRangePreset = "today" | "last7days" | "last30days" | "thisMonth" | "lastMonth" | "custom";
