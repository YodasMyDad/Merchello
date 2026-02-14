import { describe, expect, it } from "vitest";
import { calculateDiscountDelta } from "../../../wwwroot/js/checkout/components/order-summary.js";

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
