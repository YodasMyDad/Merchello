import { describe, it, expect } from "vitest";
import {
  SHIPPING_PROVIDER_ICONS,
  getShippingProviderIconSvg,
} from "@shipping/utils/brand-icons.js";

describe("shipping provider icon helpers", () => {
  it("returns flat-rate icon for flat aliases", () => {
    expect(getShippingProviderIconSvg("flat-rate")).toBe(SHIPPING_PROVIDER_ICONS["flat-rate"]);
    expect(getShippingProviderIconSvg("flat-shipping")).toBe(SHIPPING_PROVIDER_ICONS["flat-rate"]);
  });

  it("returns truck icon for branded and unknown providers", () => {
    expect(getShippingProviderIconSvg("ups")).toBe(SHIPPING_PROVIDER_ICONS.truck);
    expect(getShippingProviderIconSvg("fedex")).toBe(SHIPPING_PROVIDER_ICONS.truck);
    expect(getShippingProviderIconSvg("custom-shipping-provider")).toBe(SHIPPING_PROVIDER_ICONS.truck);
  });
});
