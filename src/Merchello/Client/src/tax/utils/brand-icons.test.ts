import { describe, it, expect } from "vitest";
import { TAX_PROVIDER_ICONS, getTaxProviderIconSvg } from "@tax/utils/brand-icons.js";

describe("tax provider icon helpers", () => {
  it("always returns calculator fallback", () => {
    expect(getTaxProviderIconSvg("avalara")).toBe(TAX_PROVIDER_ICONS.calculator);
    expect(getTaxProviderIconSvg("manual-tax")).toBe(TAX_PROVIDER_ICONS.calculator);
    expect(getTaxProviderIconSvg("custom-provider")).toBe(TAX_PROVIDER_ICONS.calculator);
  });
});
