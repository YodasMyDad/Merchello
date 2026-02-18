import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  getProductSyncRuns: vi.fn(),
  getProductSyncRunIssues: vi.fn(),
  downloadProductSyncExport: vi.fn(),
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

vi.mock("@api/merchello-api.js", () => ({
  MerchelloApi: apiMocks,
}));

vi.mock("@shared/utils/formatting.js", () => ({
  formatDateTime: (value: string) => value,
}));

import { ProductSyncDirection, ProductSyncRunStatus } from "@product-import-export/types/product-import-export.types.js";
import { MerchelloProductSyncRunsListElement } from "@product-import-export/components/product-sync-runs-list.element.js";

describe("product sync runs list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getProductSyncRuns.mockResolvedValue({
      data: {
        items: [
          {
            id: "run-1",
            direction: ProductSyncDirection.Import,
            profile: 0,
            status: ProductSyncRunStatus.Running,
            statusLabel: "Running",
            statusCssClass: "warning",
            requestedByUserName: "Admin",
            requestedByUserId: "u1",
            inputFileName: "products.csv",
            outputFileName: null,
            itemsProcessed: 1,
            itemsSucceeded: 1,
            itemsFailed: 0,
            warningCount: 0,
            errorCount: 0,
            startedAtUtc: "2026-02-18T10:00:00Z",
            completedAtUtc: null,
            dateCreatedUtc: "2026-02-18T10:00:00Z",
            errorMessage: null,
          },
        ],
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });
    apiMocks.getProductSyncRunIssues.mockResolvedValue({
      data: { items: [], page: 1, pageSize: 200, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false },
    });
    apiMocks.downloadProductSyncExport.mockResolvedValue({
      blob: new Blob(["csv"], { type: "text/csv" }),
      fileName: "export.csv",
    });
  });

  it("polls every 5 seconds while a run is running", async () => {
    vi.useFakeTimers();
    const element = new MerchelloProductSyncRunsListElement();

    element.connectedCallback();
    await Promise.resolve();

    expect(apiMocks.getProductSyncRuns).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(apiMocks.getProductSyncRuns).toHaveBeenCalledTimes(2);

    element.disconnectedCallback();
    vi.useRealTimers();
  });

  it("downloads export artifacts and applies server filename", async () => {
    const element = new MerchelloProductSyncRunsListElement();
    const downloadBlob = new Blob(["export"], { type: "text/csv" });
    apiMocks.downloadProductSyncExport.mockResolvedValue({
      blob: downloadBlob,
      fileName: "shopify-export.csv",
    });

    const createObjectUrl = vi.fn().mockReturnValue("blob:test");
    const revokeObjectUrl = vi.fn();
    const appendChildSpy = vi.spyOn(document.body, "appendChild");

    vi.stubGlobal("URL", {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    });

    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const removeSpy = vi.spyOn(link, "remove").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValue(link);

    await (element as any)._downloadExport({
      id: "run-2",
      direction: ProductSyncDirection.Export,
      status: ProductSyncRunStatus.Completed,
    });

    expect(apiMocks.downloadProductSyncExport).toHaveBeenCalledWith("run-2");
    expect(createObjectUrl).toHaveBeenCalledWith(downloadBlob);
    expect(link.download).toBe("shopify-export.csv");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(appendChildSpy).toHaveBeenCalledWith(link);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:test");

    vi.unstubAllGlobals();
  });
});
