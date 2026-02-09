import { describe, it, expect } from "vitest";
import {
  FULFILMENT_PROVIDER_ICONS,
  getFulfilmentProviderIconSvg,
} from "@fulfilment-providers/utils/brand-icons.js";

describe("fulfilment provider icon helpers", () => {
  it("returns direct key matches", () => {
    expect(getFulfilmentProviderIconSvg("shipbob")).toBe(FULFILMENT_PROVIDER_ICONS.shipbob);
    expect(getFulfilmentProviderIconSvg("manual")).toBe(FULFILMENT_PROVIDER_ICONS.manual);
    expect(getFulfilmentProviderIconSvg("warehouse")).toBe(FULFILMENT_PROVIDER_ICONS.warehouse);
  });

  it("matches partial aliases for known providers", () => {
    expect(getFulfilmentProviderIconSvg("my-shipmonk-provider")).toBe(
      FULFILMENT_PROVIDER_ICONS.shipmonk
    );
    expect(getFulfilmentProviderIconSvg("shiphero-live")).toBe(FULFILMENT_PROVIDER_ICONS.shiphero);
    expect(getFulfilmentProviderIconSvg("helm-v1")).toBe(FULFILMENT_PROVIDER_ICONS["helm-wms"]);
    expect(getFulfilmentProviderIconSvg("deliverr-us")).toBe(FULFILMENT_PROVIDER_ICONS.deliverr);
    expect(getFulfilmentProviderIconSvg("flexport-api")).toBe(FULFILMENT_PROVIDER_ICONS.flexport);
    expect(getFulfilmentProviderIconSvg("red-stag-fulfillment")).toBe(
      FULFILMENT_PROVIDER_ICONS["red-stag"]
    );
  });

  it("falls back to box icon when no match exists", () => {
    expect(getFulfilmentProviderIconSvg("custom-provider")).toBe(FULFILMENT_PROVIDER_ICONS.box);
  });
});
