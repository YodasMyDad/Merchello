import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  getFulfilmentWebhookEventTemplates: vi.fn(),
  testFulfilmentProvider: vi.fn(),
  testFulfilmentOrderSubmission: vi.fn(),
  simulateFulfilmentWebhook: vi.fn(),
  testFulfilmentProductSync: vi.fn(),
  testFulfilmentInventorySync: vi.fn(),
}));

vi.mock("@umbraco-cms/backoffice/external/lit", () => {
  class TestLitElement extends HTMLElement {
    connectedCallback(): void {}
    disconnectedCallback(): void {}
  }

  return {
    html: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings: [...strings],
      values,
    }),
    css: (..._args: unknown[]) => "",
    nothing: null,
    customElement: (tagName: string) => (target: CustomElementConstructor) => {
      if (!customElements.get(tagName)) {
        customElements.define(tagName, target);
      }
      return target;
    },
    state: () => (_proto: unknown, _key: string) => {},
    LitElement: TestLitElement,
  };
});

vi.mock("@umbraco-cms/backoffice/modal", () => ({
  UmbModalBaseElement: class extends HTMLElement {
    data: unknown;
    value: unknown;
    modalContext = { reject: vi.fn() };
    connectedCallback(): void {}
    disconnectedCallback(): void {}
  },
}));

vi.mock("@api/merchello-api.js", () => ({
  MerchelloApi: apiMocks,
}));

import { MerchelloTestFulfilmentProviderModalElement } from "@fulfilment-providers/modals/test-provider-modal.element.js";

describe("fulfilment test provider modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getFulfilmentWebhookEventTemplates.mockResolvedValue({ data: [] });
    apiMocks.testFulfilmentProvider.mockResolvedValue({ data: { success: true } });
    apiMocks.testFulfilmentOrderSubmission.mockResolvedValue({ data: { success: true } });
    apiMocks.simulateFulfilmentWebhook.mockResolvedValue({ data: { success: true, actionsPerformed: [] } });
    apiMocks.testFulfilmentProductSync.mockResolvedValue({ data: { status: 2 } });
    apiMocks.testFulfilmentInventorySync.mockResolvedValue({ data: { status: 2 } });
  });

  it("loads webhook templates on connect when provider supports webhooks", async () => {
    apiMocks.getFulfilmentWebhookEventTemplates.mockResolvedValueOnce({
      data: [{ eventType: "order.shipped", displayName: "Order Shipped" }],
    });

    const element = new MerchelloTestFulfilmentProviderModalElement();
    element.data = {
      provider: {
        configurationId: "cfg-1",
        supportsWebhooks: true,
        supportsOrderSubmission: true,
      },
    } as never;

    element.connectedCallback();
    await Promise.resolve();
    await Promise.resolve();

    expect(apiMocks.getFulfilmentWebhookEventTemplates).toHaveBeenCalledWith("cfg-1");
    expect((element as any)._webhookTemplates).toHaveLength(1);
    expect((element as any)._selectedWebhookEvent).toBe("order.shipped");
  });

  it("submits order test payload through api", async () => {
    apiMocks.testFulfilmentOrderSubmission.mockResolvedValueOnce({
      data: {
        success: true,
        providerReference: "REF-123",
        providerStatus: "accepted",
      },
    });

    const element = new MerchelloTestFulfilmentProviderModalElement();
    element.data = {
      provider: {
        configurationId: "cfg-1",
        supportsWebhooks: true,
        supportsOrderSubmission: true,
      },
    } as never;
    element.connectedCallback();

    await (element as any)._handleTestOrderSubmission();

    expect(apiMocks.testFulfilmentOrderSubmission).toHaveBeenCalledWith(
      "cfg-1",
      expect.objectContaining({
        customerEmail: "test@example.com",
        useRealSandbox: true,
        lineItems: [expect.objectContaining({ sku: "TEST-SKU-001", quantity: 1 })],
      })
    );
    expect((element as any)._orderSubmissionResult?.providerReference).toBe("REF-123");
  });

  it("simulates webhook with selected event and maps result", async () => {
    apiMocks.simulateFulfilmentWebhook.mockResolvedValueOnce({
      data: {
        success: true,
        eventTypeDetected: "order.shipped",
        actionsPerformed: ["Parsed event"],
        payload: "{}",
      },
    });

    const element = new MerchelloTestFulfilmentProviderModalElement();
    element.data = {
      provider: {
        configurationId: "cfg-1",
        supportsWebhooks: true,
        supportsOrderSubmission: true,
      },
    } as never;
    element.connectedCallback();
    (element as any)._selectedWebhookEvent = "order.shipped";
    (element as any)._webhookProviderReference = "REF-1";

    await (element as any)._handleSimulateWebhook();

    expect(apiMocks.simulateFulfilmentWebhook).toHaveBeenCalledWith(
      "cfg-1",
      expect.objectContaining({
        eventType: "order.shipped",
        providerReference: "REF-1",
      })
    );
    expect((element as any)._webhookSimulationResult?.success).toBe(true);
  });

  it("calls dedicated product and inventory sync test endpoints", async () => {
    const element = new MerchelloTestFulfilmentProviderModalElement();
    element.data = {
      provider: {
        configurationId: "cfg-1",
        supportsWebhooks: true,
        supportsOrderSubmission: true,
      },
    } as never;

    await (element as any)._handleProductSync();
    await (element as any)._handleInventorySync();

    expect(apiMocks.testFulfilmentProductSync).toHaveBeenCalledWith("cfg-1");
    expect(apiMocks.testFulfilmentInventorySync).toHaveBeenCalledWith("cfg-1");
  });

  it("renders order submission and webhook tabs when provider supports both capabilities", () => {
    const element = new MerchelloTestFulfilmentProviderModalElement();
    element.data = {
      provider: {
        configurationId: "cfg-1",
        supportsWebhooks: true,
        supportsOrderSubmission: true,
      },
    } as never;

    const template = element.render();
    const serialized = JSON.stringify(template);

    expect(serialized).toContain("Order Submission");
    expect(serialized).toContain("Webhooks");
  });
});
