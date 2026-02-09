import { describe, it, expect } from "vitest";
import { TAX_PROVIDER_ICONS, getTaxProviderIconSvg } from "@tax/utils/brand-icons.js";

describe("tax provider icon helpers", () => {
  it("returns direct alias matches", () => {
    expect(getTaxProviderIconSvg("avalara")).toBe(TAX_PROVIDER_ICONS.avalara);
  });

  it("matches partial provider aliases", () => {
    expect(getTaxProviderIconSvg("avalara-live")).toBe(TAX_PROVIDER_ICONS.avalara);
  });

  it("falls back to calculator icon for unknown providers", () => {
    expect(getTaxProviderIconSvg("manual-tax")).toBe(TAX_PROVIDER_ICONS.calculator);
  });
});
