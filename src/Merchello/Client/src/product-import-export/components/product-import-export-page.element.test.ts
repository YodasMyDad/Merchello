import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  validateProductImport: vi.fn(),
  startProductImport: vi.fn(),
  startProductExport: vi.fn(),
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
    query: () => (_proto: unknown, _key: string) => {},
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

vi.mock("@product-import-export/components/product-sync-runs-list.element.js", () => ({}));

import {
  ProductSyncProfile,
} from "@product-import-export/types/product-import-export.types.js";
import { MerchelloProductImportExportPageElement } from "@product-import-export/components/product-import-export-page.element.js";

describe("product import/export page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.validateProductImport.mockResolvedValue({ data: { isValid: true, errorCount: 0, warningCount: 0, rowCount: 1, distinctHandleCount: 1, issues: [] } });
    apiMocks.startProductImport.mockResolvedValue({ data: { id: "run-1" } });
    apiMocks.startProductExport.mockResolvedValue({ data: { id: "run-2" } });
  });

  it("blocks import start when validation has errors", async () => {
    const element = new MerchelloProductImportExportPageElement();
    (element as any)._selectedFile = new File(["csv"], "products.csv", { type: "text/csv" });
    (element as any)._validationResult = {
      isValid: false,
      rowCount: 1,
      distinctHandleCount: 1,
      warningCount: 0,
      errorCount: 1,
      issues: [],
    };
    (element as any)._importProfile = ProductSyncProfile.ShopifyStrict;

    await (element as any)._startImport();

    expect(apiMocks.startProductImport).not.toHaveBeenCalled();
  });

  it("calls export start endpoint with selected profile", async () => {
    const element = new MerchelloProductImportExportPageElement();
    (element as any)._exportProfile = ProductSyncProfile.MerchelloExtended;

    await (element as any)._startExport();

    expect(apiMocks.startProductExport).toHaveBeenCalledWith({
      profile: ProductSyncProfile.MerchelloExtended,
    });
  });
});
