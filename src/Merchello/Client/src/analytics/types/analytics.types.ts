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

/**
 * Result DTO for time series chart data including aggregated values.
 * All calculations are performed server-side to avoid frontend logic duplication.
 */
export interface TimeSeriesResultDto {
  /** Individual data points for the time series chart. */
  dataPoints: TimeSeriesDataPointDto[];
  /**
   * Total value for the current period (sum of all data point values).
   * Calculated by backend to avoid frontend aggregation.
   */
  periodTotal: number;
  /**
   * Total value for the comparison period (sum of all comparison values).
   * Calculated by backend to avoid frontend aggregation.
   */
  comparisonTotal: number | null;
  /**
   * Percentage change from comparison period to current period.
   * Calculated by backend using consistent methodology.
   * Positive = increase, Negative = decrease.
   */
  percentChange: number | null;
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
