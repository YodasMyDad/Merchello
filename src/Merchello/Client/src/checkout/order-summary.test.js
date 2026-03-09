import { describe, expect, it } from "vitest";
import { calculateDiscountDelta, getEffectiveDiscount } from "./order-summary.js";

describe("checkout order-summary analytics helpers", () => {
  it("returns the positive delta when discount increases", () => {
    expect(calculateDiscountDelta(5, 12)).toBe(7);
  });

  it("returns zero when discount decreases", () => {
    expect(calculateDiscountDelta(12, 5)).toBe(0);
  });

  it("treats non-finite values as zero", () => {
    expect(calculateDiscountDelta(Number.NaN, Infinity)).toBe(0);
    expect(calculateDiscountDelta(Number.NaN, 4)).toBe(4);
  });
});

describe("getEffectiveDiscount - tax-inclusive discount display", () => {
  // Exact bug scenario: Tee ($19.99) + Beanie ($14.99), 20% VAT, 10% off Tee
  // Ex-tax discount: $2.00, Tax-inclusive discount: $2.40

  it("returns tax-inclusive discount when displayPricesIncTax is true", () => {
    expect(getEffectiveDiscount(true, 2.40, 2.00)).toBe(2.40);
  });

  it("returns ex-tax basket discount when displayPricesIncTax is false", () => {
    expect(getEffectiveDiscount(false, 2.40, 2.00)).toBe(2.00);
  });

  it("falls back to basket discount when tax-inclusive value is null", () => {
    expect(getEffectiveDiscount(true, null, 2.00)).toBe(2.00);
  });

  it("falls back to basket discount when tax-inclusive value is undefined", () => {
    expect(getEffectiveDiscount(true, undefined, 2.00)).toBe(2.00);
  });

  it("falls back to basket discount when tax-inclusive value is 0", () => {
    // 0 is falsy, so falls back to basket discount
    expect(getEffectiveDiscount(true, 0, 5.00)).toBe(5.00);
  });

  it("returns 0 when no discount values available", () => {
    expect(getEffectiveDiscount(true, null, null)).toBe(0);
    expect(getEffectiveDiscount(false, null, null)).toBe(0);
  });

  it("handles NaN and Infinity gracefully", () => {
    expect(getEffectiveDiscount(true, NaN, 2.00)).toBe(2.00);
    expect(getEffectiveDiscount(false, NaN, NaN)).toBe(0);
    expect(getEffectiveDiscount(true, Infinity, 2.00)).toBe(2.00);
  });

  it("ignores tax-inclusive discount when displayPricesIncTax is false even if available", () => {
    // When not displaying inc-tax, always use basket discount regardless
    expect(getEffectiveDiscount(false, 12.00, 10.00)).toBe(10.00);
  });

  it("handles multi-rate discount scenario correctly", () => {
    // Two discounts: $10 on 20% product + $10 on 5% product
    // Tax-inclusive: $12.00 + $10.50 = $22.50
    // Ex-tax: $20.00
    expect(getEffectiveDiscount(true, 22.50, 20.00)).toBe(22.50);
    expect(getEffectiveDiscount(false, 22.50, 20.00)).toBe(20.00);
  });

  it("handles currency-converted values", () => {
    // USD to GBP at 0.79: $10 * 1.20 * 0.79 = £9.48
    expect(getEffectiveDiscount(true, 9.48, 7.90)).toBe(9.48);
  });
});
