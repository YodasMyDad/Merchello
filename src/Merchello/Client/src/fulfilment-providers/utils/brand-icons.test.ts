import { describe, it, expect } from "vitest";
import {
  FULFILMENT_PROVIDER_ICONS,
  getFulfilmentProviderIconSvg,
} from "@fulfilment-providers/utils/brand-icons.js";

describe("fulfilment provider icon helpers", () => {
  it("returns generic manual/warehouse/truck fallbacks", () => {
    expect(getFulfilmentProviderIconSvg("manual")).toBe(FULFILMENT_PROVIDER_ICONS.manual);
    expect(getFulfilmentProviderIconSvg("warehouse")).toBe(FULFILMENT_PROVIDER_ICONS.warehouse);
    expect(getFulfilmentProviderIconSvg("shipbob")).toBe(FULFILMENT_PROVIDER_ICONS.truck);
  });

  it("falls back to box icon when no generic hint exists", () => {
    expect(getFulfilmentProviderIconSvg("custom-provider")).toBe(FULFILMENT_PROVIDER_ICONS.box);
  });
});
