import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  getAvailableFulfilmentProviders: vi.fn(),
  getFulfilmentProviderConfigurations: vi.fn(),
  toggleFulfilmentProvider: vi.fn(),
  deleteFulfilmentProvider: vi.fn(),
}));

vi.mock("@umbraco-cms/backoffice/external/lit", () => {
  class TestLitElement extends HTMLElement {
    connectedCallback(): void {}
    disconnectedCallback(): void {}
  }

  return {
    LitElement: TestLitElement,
    html: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings: [...strings],
      values,
    }),
    css: (..._args: unknown[]) => "",
    nothing: null,
    unsafeHTML: (value: string) => value,
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

vi.mock("@umbraco-cms/backoffice/modal", () => ({
  UMB_MODAL_MANAGER_CONTEXT: Symbol("UMB_MODAL_MANAGER_CONTEXT"),
  UMB_CONFIRM_MODAL: Symbol("UMB_CONFIRM_MODAL"),
}));

vi.mock("@umbraco-cms/backoffice/notification", () => ({
  UMB_NOTIFICATION_CONTEXT: Symbol("UMB_NOTIFICATION_CONTEXT"),
}));

vi.mock("@api/merchello-api.js", () => ({
  MerchelloApi: apiMocks,
}));

vi.mock("@fulfilment-providers/modals/fulfilment-provider-config-modal.token.js", () => ({
  MERCHELLO_FULFILMENT_PROVIDER_CONFIG_MODAL: Symbol("config-modal"),
}));

vi.mock("@fulfilment-providers/modals/test-provider-modal.token.js", () => ({
  MERCHELLO_TEST_FULFILMENT_PROVIDER_MODAL: Symbol("test-modal"),
}));

vi.mock("@fulfilment-providers/utils/brand-icons.js", () => ({
  getFulfilmentProviderIconSvg: vi.fn().mockReturnValue("<svg></svg>"),
}));

vi.mock("@fulfilment-providers/components/sync-logs-list.element.js", () => ({}));

import { MerchelloFulfilmentProvidersListElement } from "@fulfilment-providers/components/fulfilment-providers-list.element.js";

describe("fulfilment providers list element", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getAvailableFulfilmentProviders.mockResolvedValue({ data: [] });
    apiMocks.getFulfilmentProviderConfigurations.mockResolvedValue({ data: [] });
    apiMocks.toggleFulfilmentProvider.mockResolvedValue({});
    apiMocks.deleteFulfilmentProvider.mockResolvedValue({});
  });

  it("copies webhook url to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    const element = new MerchelloFulfilmentProvidersListElement();
    await (element as any)._copyToClipboard("https://example.test/webhook");

    expect(writeText).toHaveBeenCalledWith("https://example.test/webhook");
  });

  it("renders webhook url section for webhook-capable providers", () => {
    const element = new MerchelloFulfilmentProvidersListElement();
    (element as any)._availableProviders = [
      { key: "shipbob", supportsWebhooks: true },
    ];

    const template = (element as any)._renderConfiguredProvider({
      key: "shipbob",
      displayName: "ShipBob",
      isEnabled: true,
      supportsWebhooks: true,
      configurationId: "cfg-1",
    });

    const serialized = JSON.stringify(template);
    expect(serialized).toContain("/umbraco/merchello/webhooks/fulfilment/shipbob");
  });

  it("does not render webhook url section for providers without webhook support", () => {
    const element = new MerchelloFulfilmentProvidersListElement();
    (element as any)._availableProviders = [
      { key: "supplier-direct", supportsWebhooks: false },
    ];

    const template = (element as any)._renderConfiguredProvider({
      key: "supplier-direct",
      displayName: "Supplier Direct",
      isEnabled: true,
      supportsWebhooks: false,
      configurationId: "cfg-2",
    });

    const serialized = JSON.stringify(template);
    expect(serialized).not.toContain("/umbraco/merchello/webhooks/fulfilment/supplier-direct");
  });
});
