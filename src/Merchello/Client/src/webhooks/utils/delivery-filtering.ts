import { OutboundDeliveryStatus } from "@webhooks/types/webhooks.types.js";

export type DeliveryFilterTab = "all" | "succeeded" | "failed" | "pending";

export function getStatusesForDeliveryTab(tab: DeliveryFilterTab): OutboundDeliveryStatus[] | undefined {
  switch (tab) {
    case "succeeded":
      return [OutboundDeliveryStatus.Succeeded];
    case "failed":
      return [OutboundDeliveryStatus.Failed, OutboundDeliveryStatus.Abandoned];
    case "pending":
      return [OutboundDeliveryStatus.Pending, OutboundDeliveryStatus.Retrying];
    default:
      return undefined;
  }
}
