import { describe, it, expect } from "vitest";
import { BRAND_ICONS, getBrandIconSvg, getProviderIconSvg } from "@payment-providers/utils/brand-icons.js";

describe("payment brand icon helpers", () => {
  describe("getBrandIconSvg", () => {
    it("matches common payment aliases by substring", () => {
      expect(getBrandIconSvg("cards")).toBe(BRAND_ICONS.card);
      expect(getBrandIconSvg("paypal-express")).toBe(BRAND_ICONS.paypal);
      expect(getBrandIconSvg("applepay")).toBe(BRAND_ICONS.apple);
      expect(getBrandIconSvg("google-pay")).toBe(BRAND_ICONS.google);
      expect(getBrandIconSvg("manual-payment")).toBe(BRAND_ICONS.manual);
    });

    it("matches exact local payment aliases", () => {
      expect(getBrandIconSvg("ideal")).toBe(BRAND_ICONS.ideal);
      expect(getBrandIconSvg("bancontact")).toBe(BRAND_ICONS.bancontact);
      expect(getBrandIconSvg("sepa")).toBe(BRAND_ICONS.sepa);
      expect(getBrandIconSvg("eps")).toBe(BRAND_ICONS.eps);
      expect(getBrandIconSvg("p24")).toBe(BRAND_ICONS.p24);
    });

    it("returns null when no icon can be resolved", () => {
      expect(getBrandIconSvg("unknown-method")).toBeNull();
    });
  });

  describe("getProviderIconSvg", () => {
    it("matches known provider aliases", () => {
      expect(getProviderIconSvg("stripe")).toBe(BRAND_ICONS.stripe);
      expect(getProviderIconSvg("braintree")).toBe(BRAND_ICONS.braintree);
      expect(getProviderIconSvg("paypal")).toBe(BRAND_ICONS.paypal);
      expect(getProviderIconSvg("worldpay")).toBe(BRAND_ICONS.worldpay);
      expect(getProviderIconSvg("manual")).toBe(BRAND_ICONS.manual);
    });

    it("returns null for unknown providers", () => {
      expect(getProviderIconSvg("custom-provider")).toBeNull();
    });
  });
});
