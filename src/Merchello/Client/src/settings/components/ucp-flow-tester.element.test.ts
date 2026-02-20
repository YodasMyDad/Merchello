import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  getUcpFlowDiagnostics: vi.fn(),
  ucpTestManifest: vi.fn(),
  ucpTestCreateSession: vi.fn(),
  ucpTestGetSession: vi.fn(),
  ucpTestUpdateSession: vi.fn(),
  ucpTestCompleteSession: vi.fn(),
  ucpTestCancelSession: vi.fn(),
  ucpTestGetOrder: vi.fn(),
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

vi.mock("@umbraco-cms/backoffice/modal", () => ({
  UMB_MODAL_MANAGER_CONTEXT: Symbol("UMB_MODAL_MANAGER_CONTEXT"),
}));

vi.mock("@umbraco-cms/backoffice/notification", () => ({
  UMB_NOTIFICATION_CONTEXT: Symbol("UMB_NOTIFICATION_CONTEXT"),
}));

vi.mock("@api/merchello-api.js", () => ({
  MerchelloApi: apiMocks,
}));

vi.mock("@shared/product-picker/product-picker-modal.token.js", () => ({
  MERCHELLO_PRODUCT_PICKER_MODAL: Symbol("MERCHELLO_PRODUCT_PICKER_MODAL"),
}));

vi.mock("@shared/utils/formatting.js", () => ({
  formatNumber: vi.fn((value: number) => value.toString()),
}));

import { MerchelloUcpFlowTesterElement } from "@settings/components/ucp-flow-tester.element.js";

describe("ucp flow tester element", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getUcpFlowDiagnostics.mockResolvedValue({
      data: {
        protocolVersion: "2026-01-23",
        capabilities: [],
        extensions: [],
        requireHttps: true,
        minimumTlsVersion: "1.3",
        strictModeAvailable: true,
        strictFallbackMode: "adapter",
        simulatedAgentId: "agent-1",
        timestampUtc: "2026-02-19T00:00:00Z",
      },
    });
    apiMocks.ucpTestCompleteSession.mockResolvedValue({
      data: {
        step: "complete_session",
        success: true,
        modeRequested: "adapter",
        modeExecuted: "adapter",
        fallbackApplied: false,
        dryRun: false,
        dryRunSkippedExecution: false,
        timestampUtc: "2026-02-19T00:00:00Z",
        durationMs: 1,
      },
    });
  });

  it("defaults to dry-run mode", () => {
    const element = new MerchelloUcpFlowTesterElement();

    expect((element as unknown as { _dryRun: boolean })._dryRun).toBe(true);
  });

  it("marks strict mode blocked when diagnostics report unavailable", () => {
    const element = new MerchelloUcpFlowTesterElement() as unknown as {
      _modeRequested: "adapter" | "strict";
      _diagnostics: { strictModeAvailable: boolean } | null;
      _isStrictModeBlocked: () => boolean;
    };
    element._modeRequested = "strict";
    element._diagnostics = { strictModeAvailable: false };

    expect(element._isStrictModeBlocked()).toBe(true);
  });

  it("applies step results to transcript, session, status, and order state", () => {
    const element = new MerchelloUcpFlowTesterElement() as unknown as {
      _applyStepResult: (result: unknown) => void;
      _transcripts: unknown[];
      _sessionId: string | null;
      _sessionStatus: string | null;
      _orderId: string | null;
    };

    element._applyStepResult({
      step: "complete_session",
      success: true,
      modeRequested: "adapter",
      modeExecuted: "adapter",
      fallbackApplied: false,
      dryRun: false,
      dryRunSkippedExecution: false,
      timestampUtc: "2026-02-19T00:00:00Z",
      durationMs: 2,
      sessionId: "session-1",
      status: "completed",
      orderId: "order-1",
    });

    expect(element._transcripts).toHaveLength(1);
    expect(element._sessionId).toBe("session-1");
    expect(element._sessionStatus).toBe("completed");
    expect(element._orderId).toBe("order-1");
  });

  it("blocks real complete step until explicit confirmation", async () => {
    const element = new MerchelloUcpFlowTesterElement() as unknown as {
      _sessionId: string | null;
      _dryRun: boolean;
      _realOrderConfirmed: boolean;
      _executeCompleteSessionStep: () => Promise<void>;
    };

    element._sessionId = "session-1";
    element._dryRun = false;
    element._realOrderConfirmed = false;

    await element._executeCompleteSessionStep();

    expect(apiMocks.ucpTestCompleteSession).not.toHaveBeenCalled();
  });

  it("builds multi-item line payloads from selected products", () => {
    const element = new MerchelloUcpFlowTesterElement() as unknown as {
      _templatePreset: string;
      _selectedProducts: Array<{
        key: string;
        productId: string;
        productRootId: string;
        name: string;
        sku: string | null;
        price: number;
        imageUrl: string | null;
        quantity: number;
        selectedAddons: [];
      }>;
      _buildLineItemsPayload: () => Array<unknown>;
    };

    element._templatePreset = "multi-item";
    element._selectedProducts = [
      {
        key: "prod-1",
        productId: "prod-1",
        productRootId: "root-1",
        name: "Product One",
        sku: "SKU-1",
        price: 10,
        imageUrl: null,
        quantity: 1,
        selectedAddons: [],
      },
    ];

    const payload = element._buildLineItemsPayload();
    expect(payload).toHaveLength(2);
  });

  it("clears active step when execution throws unexpectedly", async () => {
    const element = new MerchelloUcpFlowTesterElement() as unknown as {
      _activeStep: string | null;
      _executeStep: (
        stepName: string,
        runner: () => Promise<{ data?: unknown; error?: Error }>
      ) => Promise<void>;
    };

    await element._executeStep("manifest", async () => {
      throw new Error("boom");
    });

    expect(element._activeStep).toBeNull();
  });
});
