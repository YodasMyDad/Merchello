import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatItemCount,
  formatShortDate,
  formatDate,
  formatDateTime,
  formatRelativeDate,
} from "@shared/utils/formatting.js";

describe("formatting utilities", () => {
  describe("formatCurrency", () => {
    it("formats amount with currency code", () => {
      const result = formatCurrency(99.99, "GBP");
      expect(result).toMatch(/99\.99/);
    });

    it("handles zero amount", () => {
      const result = formatCurrency(0, "GBP");
      expect(result).toMatch(/0\.00/);
    });

    it("handles negative amounts", () => {
      const result = formatCurrency(-50.0, "GBP");
      expect(result).toMatch(/50\.00/);
    });

    it("formats with two decimal places", () => {
      const result = formatCurrency(100, "USD");
      expect(result).toMatch(/100\.00/);
    });

    it("falls back to symbol when currency code is invalid", () => {
      const result = formatCurrency(100, "INVALID", "$");
      expect(result).toContain("$");
      expect(result).toMatch(/100\.00/);
    });
  });

  describe("formatNumber", () => {
    it("formats number with no decimals by default", () => {
      const result = formatNumber(1234);
      expect(result).toMatch(/1.*234/);
    });

    it("formats number with specified decimals", () => {
      const result = formatNumber(1234.5678, 2);
      expect(result).toMatch(/1.*234.*57/);
    });

    it("handles zero", () => {
      const result = formatNumber(0);
      expect(result).toBe("0");
    });

    it("handles negative numbers", () => {
      const result = formatNumber(-500);
      expect(result).toMatch(/-.*500/);
    });
  });

  describe("formatPercent", () => {
    it("adds plus sign for positive values", () => {
      expect(formatPercent(25)).toBe("+25%");
    });

    it("keeps minus sign for negative values", () => {
      expect(formatPercent(-10)).toBe("-10%");
    });

    it("adds plus sign for zero", () => {
      expect(formatPercent(0)).toBe("+0%");
    });

    it("handles large percentages", () => {
      expect(formatPercent(150)).toBe("+150%");
    });
  });

  describe("formatItemCount", () => {
    it("uses singular for count of 1", () => {
      expect(formatItemCount(1)).toBe("1 item");
    });

    it("uses plural for count greater than 1", () => {
      expect(formatItemCount(5)).toBe("5 items");
    });

    it("uses plural for count of 0", () => {
      expect(formatItemCount(0)).toBe("0 items");
    });

    it("handles large counts", () => {
      expect(formatItemCount(1000)).toBe("1000 items");
    });
  });

  describe("formatShortDate", () => {
    it("formats date as short date", () => {
      const result = formatShortDate("2024-06-15T10:30:00Z");
      expect(result).toMatch(/Jun.*15.*2024/);
    });
  });

  describe("formatDate", () => {
    it("formats date as localized date", () => {
      const result = formatDate("2024-06-15T10:30:00Z");
      expect(result).toMatch(/\d+/);
    });
  });

  describe("formatDateTime", () => {
    it("includes date and time", () => {
      const result = formatDateTime("2024-06-15T10:30:00Z");
      expect(result).toContain("at");
      expect(result).toMatch(/\d+/);
    });
  });

  describe("formatRelativeDate", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("formats same-day dates as today", () => {
      const result = formatRelativeDate("2024-06-15T09:30:00Z");
      expect(result).toContain("Today at ");
    });

    it("formats one-day difference as yesterday", () => {
      const result = formatRelativeDate("2024-06-14T12:00:00Z");
      expect(result).toContain("Yesterday at ");
    });

    it("formats dates within a week with weekday and time", () => {
      const result = formatRelativeDate("2024-06-10T12:00:00Z");
      expect(result).toContain(" at ");
      expect(result).not.toContain("Today");
      expect(result).not.toContain("Yesterday");
    });

    it("formats older dates with month-day-year format", () => {
      const result = formatRelativeDate("2024-06-01T12:00:00Z");
      expect(result).toMatch(/[A-Za-z]{3}\s+\d{1,2},\s+\d{4}/);
      expect(result).not.toContain(" at ");
    });
  });
});
