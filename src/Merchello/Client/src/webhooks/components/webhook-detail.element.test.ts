import { beforeEach, describe, expect, it, vi } from "vitest";

const { getWebhookDeliveries, retryDelivery } = vi.hoisted(() => ({
  getWebhookDeliveries: vi.fn(),
  retryDelivery: vi.fn(),
}));

vi.mock("@umbraco-cms/backoffice/external/lit", () => {
  class TestLitElement extends HTMLElement {
    connectedCallback(): void {}
    disconnectedCallback(): void {}
  }

  return {
    LitElement: TestLitElement,
    html: (..._args: unknown[]) => "",
    css: (..._args: unknown[]) => "",
    nothing: null,
    customElement: (tagName: string) => (target: CustomElementConstructor) => {
      if (!customElements.get(tagName)) {
        customElements.define(tagName, target);
      }

      return target;
    },
    state: () => (_proto: unknown, _key: string) => {},
  };
});

vi.mock("@umbraco-cms/backoffice/element-api", () => ({
  UmbElementMixin: (base: typeof HTMLElement) =>
    class extends base {
      consumeContext(): void {}
      observe(): void {}
    },
}));

vi.mock("@umbraco-cms/backoffice/notification", () => ({
  UMB_NOTIFICATION_CONTEXT: Symbol("UMB_NOTIFICATION_CONTEXT"),
}));

vi.mock("@umbraco-cms/backoffice/modal", () => ({
  UMB_MODAL_MANAGER_CONTEXT: Symbol("UMB_MODAL_MANAGER_CONTEXT"),
}));

vi.mock("@umbraco-cms/backoffice/workspace", () => ({
  UMB_WORKSPACE_CONTEXT: Symbol("UMB_WORKSPACE_CONTEXT"),
}));

vi.mock("@api/merchello-api.js", () => ({
  MerchelloApi: {
    getWebhookDeliveries,
    retryDelivery,
    getWebhookTopicsByCategory: vi.fn().mockResolvedValue({ data: [] }),
    deleteWebhookSubscription: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@shared/utils/navigation.js", () => ({
  navigateToWebhooksList: vi.fn(),
}));

vi.mock("@webhooks/modals/webhook-subscription-modal.token.js", () => ({
  MERCHELLO_WEBHOOK_SUBSCRIPTION_MODAL: Symbol("modal"),
}));

vi.mock("@webhooks/modals/webhook-test-modal.token.js", () => ({
  MERCHELLO_WEBHOOK_TEST_MODAL: Symbol("modal"),
}));

vi.mock("@webhooks/modals/delivery-detail-modal.token.js", () => ({
  MERCHELLO_DELIVERY_DETAIL_MODAL: Symbol("modal"),
}));

vi.mock("@webhooks/modals/webhook-integration-guide-modal.token.js", () => ({
  MERCHELLO_WEBHOOK_INTEGRATION_GUIDE_MODAL: Symbol("modal"),
}));

vi.mock("@shared/components/pagination.element.js", () => ({}));
vi.mock("@shared/components/merchello-empty-state.element.js", () => ({}));

import { OutboundDeliveryStatus } from "@webhooks/types/webhooks.types.js";
import { MerchelloWebhookDetailElement } from "@webhooks/components/webhook-detail.element.js";

function createDeliveryPage() {
  return {
    items: [],
    totalItems: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  };
}

describe("webhook detail element", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWebhookDeliveries.mockResolvedValue({ data: createDeliveryPage() });
    retryDelivery.mockResolvedValue({});
  });

  it("maps failed tab to failed and abandoned delivery statuses", async () => {
    const element = new MerchelloWebhookDetailElement();
    (element as any)._initializeSettings = vi.fn().mockResolvedValue(undefined);
    element.connectedCallback();

    (element as any)._subscription = { id: "sub-1" };
    (element as any)._activeTab = "failed";

    await (element as any)._loadDeliveries();

    expect(getWebhookDeliveries).toHaveBeenCalledWith(
      "sub-1",
      expect.objectContaining({
        statuses: [OutboundDeliveryStatus.Failed, OutboundDeliveryStatus.Abandoned],
      }),
    );
  });

  it("retries delivery and refreshes current tab data", async () => {
    const element = new MerchelloWebhookDetailElement();
    (element as any)._initializeSettings = vi.fn().mockResolvedValue(undefined);
    element.connectedCallback();

    (element as any)._subscription = { id: "sub-1" };
    (element as any)._activeTab = "pending";

    await (element as any)._handleRetryDelivery(new MouseEvent("click"), { id: "delivery-1" });

    expect(retryDelivery).toHaveBeenCalledWith("delivery-1");
    expect(getWebhookDeliveries).toHaveBeenCalledWith(
      "sub-1",
      expect.objectContaining({
        statuses: [OutboundDeliveryStatus.Pending, OutboundDeliveryStatus.Retrying],
      }),
    );
  });
});
