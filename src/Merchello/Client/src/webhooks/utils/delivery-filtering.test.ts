import { describe, expect, it } from "vitest";
import { OutboundDeliveryStatus } from "@webhooks/types/webhooks.types.js";
import { getStatusesForDeliveryTab } from "@webhooks/utils/delivery-filtering.js";

describe("delivery filtering", () => {
  it("maps failed tab to failed and abandoned statuses", () => {
    expect(getStatusesForDeliveryTab("failed")).toEqual([
      OutboundDeliveryStatus.Failed,
      OutboundDeliveryStatus.Abandoned,
    ]);
  });

  it("maps pending tab to pending and retrying statuses", () => {
    expect(getStatusesForDeliveryTab("pending")).toEqual([
      OutboundDeliveryStatus.Pending,
      OutboundDeliveryStatus.Retrying,
    ]);
  });

  it("maps succeeded tab to succeeded status", () => {
    expect(getStatusesForDeliveryTab("succeeded")).toEqual([
      OutboundDeliveryStatus.Succeeded,
    ]);
  });

  it("returns undefined for all tab", () => {
    expect(getStatusesForDeliveryTab("all")).toBeUndefined();
  });
});
