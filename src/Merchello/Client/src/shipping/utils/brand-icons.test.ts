import { describe, it, expect } from "vitest";
import {
  SHIPPING_PROVIDER_ICONS,
  getShippingProviderIconSvg,
} from "@shipping/utils/brand-icons.js";

describe("shipping provider icon helpers", () => {
  it("returns direct matches by key", () => {
    expect(getShippingProviderIconSvg("ups")).toBe(SHIPPING_PROVIDER_ICONS.ups);
    expect(getShippingProviderIconSvg("fedex")).toBe(SHIPPING_PROVIDER_ICONS.fedex);
    expect(getShippingProviderIconSvg("flat-rate")).toBe(SHIPPING_PROVIDER_ICONS["flat-rate"]);
  });

  it("returns partial matches for common providers", () => {
    expect(getShippingProviderIconSvg("ups-standard")).toBe(SHIPPING_PROVIDER_ICONS.ups);
    expect(getShippingProviderIconSvg("my-fedex-provider")).toBe(SHIPPING_PROVIDER_ICONS.fedex);
    expect(getShippingProviderIconSvg("flat-shipping")).toBe(SHIPPING_PROVIDER_ICONS["flat-rate"]);
  });

  it("falls back to truck icon when no match exists", () => {
    expect(getShippingProviderIconSvg("custom-shipping-provider")).toBe(SHIPPING_PROVIDER_ICONS.truck);
  });
});
