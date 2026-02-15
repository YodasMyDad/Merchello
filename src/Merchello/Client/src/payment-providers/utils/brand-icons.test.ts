import { describe, it, expect } from "vitest";
import { BRAND_ICONS, getBrandIconSvg, getProviderIconSvg } from "@payment-providers/utils/brand-icons.js";

describe("payment brand icon helpers", () => {
  describe("getBrandIconSvg", () => {
    it("returns generic card icon for card aliases", () => {
      expect(getBrandIconSvg("cards")).toBe(BRAND_ICONS.card);
      expect(getBrandIconSvg("credit-card-hosted")).toBe(BRAND_ICONS.card);
    });

    it("returns generic manual icon for manual-style aliases", () => {
      expect(getBrandIconSvg("manual-payment")).toBe(BRAND_ICONS.manual);
      expect(getBrandIconSvg("purchase-order")).toBe(BRAND_ICONS.manual);
    });

    it("returns null for branded aliases when backend icon is expected", () => {
      expect(getBrandIconSvg("paypal")).toBeNull();
      expect(getBrandIconSvg("applepay")).toBeNull();
      expect(getBrandIconSvg("amazonpay")).toBeNull();
      expect(getBrandIconSvg("klarna")).toBeNull();
    });
  });

  describe("getProviderIconSvg", () => {
    it("returns manual icon for manual providers", () => {
      expect(getProviderIconSvg("manual")).toBe(BRAND_ICONS.manual);
    });

    it("returns generic card icon for unknown/branded providers", () => {
      expect(getProviderIconSvg("stripe")).toBe(BRAND_ICONS.card);
      expect(getProviderIconSvg("paypal")).toBe(BRAND_ICONS.card);
      expect(getProviderIconSvg("worldpay")).toBe(BRAND_ICONS.card);
      expect(getProviderIconSvg("custom-provider")).toBe(BRAND_ICONS.card);
    });
  });
});
