import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateToWebhookDetail, updateWebhookSubscription } = vi.hoisted(() => ({
  navigateToWebhookDetail: vi.fn(),
  updateWebhookSubscription: vi.fn(),
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

vi.mock("@api/merchello-api.js", () => ({
  MerchelloApi: {
    updateWebhookSubscription,
    getWebhookTopicsByCategory: vi.fn().mockResolvedValue({ data: [] }),
    getWebhookStats: vi.fn().mockResolvedValue({ data: null }),
    getWebhookSubscriptions: vi.fn().mockResolvedValue({ data: { items: [], totalItems: 0, totalPages: 0 } }),
    getWebhookSubscription: vi.fn().mockResolvedValue({ data: null }),
    deleteWebhookSubscription: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@shared/utils/navigation.js", () => ({
  navigateToWebhookDetail,
}));

vi.mock("@webhooks/modals/webhook-subscription-modal.token.js", () => ({
  MERCHELLO_WEBHOOK_SUBSCRIPTION_MODAL: Symbol("modal"),
}));

vi.mock("@webhooks/modals/webhook-test-modal.token.js", () => ({
  MERCHELLO_WEBHOOK_TEST_MODAL: Symbol("modal"),
}));

vi.mock("@shared/components/pagination.element.js", () => ({}));
vi.mock("@shared/components/merchello-empty-state.element.js", () => ({}));

import { MerchelloWebhooksListElement } from "@webhooks/components/webhooks-list.element.js";

function createSubscription() {
  return {
    id: "webhook-1",
    name: "Webhook 1",
    topic: "order.created",
    topicDisplayName: "Order Created",
    targetUrl: "https://example.com",
    isActive: true,
    authType: 0,
    authTypeDisplay: "None",
    successCount: 1,
    failureCount: 0,
    lastTriggeredUtc: null,
    lastSuccessUtc: null,
    lastErrorMessage: null,
    dateCreated: "2025-01-01T00:00:00Z",
  };
}

describe("webhooks list element", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to webhook detail from row action", () => {
    const element = new MerchelloWebhooksListElement();
    const subscription = createSubscription();

    (element as any)._handleViewDeliveries(subscription);

    expect(navigateToWebhookDetail).toHaveBeenCalledWith("webhook-1");
  });

  it("reverts optimistic toggle when API call fails", async () => {
    const element = new MerchelloWebhooksListElement();
    const subscription = createSubscription();
    (element as any)._initializeAndLoad = vi.fn().mockResolvedValue(undefined);
    element.connectedCallback();

    (element as any)._subscriptions = [subscription];
    updateWebhookSubscription.mockResolvedValueOnce({ error: new Error("toggle failed") });

    await (element as any)._handleToggleActive(new MouseEvent("click"), subscription);

    expect((element as any)._subscriptions[0].isActive).toBe(true);
  });
});
