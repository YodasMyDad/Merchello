import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductListItemDto } from "@products/types/product.types.js";

vi.mock("@umbraco-cms/backoffice/external/lit", () => {
  class TestLitElement extends HTMLElement {
    connectedCallback(): void {}
    disconnectedCallback(): void {}
  }

  const renderTemplate = (strings: TemplateStringsArray, ...values: unknown[]): string =>
    strings.reduce(
      (result, part, index) => `${result}${part}${index < values.length ? String(values[index]) : ""}`,
      ""
    );

  return {
    LitElement: TestLitElement,
    html: renderTemplate,
    css: (..._args: unknown[]) => "",
    nothing: null,
    customElement: (tagName: string) => (target: CustomElementConstructor) => {
      if (!customElements.get(tagName)) {
        customElements.define(tagName, target);
      }

      return target;
    },
    property: () => (_proto: unknown, _key: string) => {},
  };
});

vi.mock("@umbraco-cms/backoffice/element-api", () => ({
  UmbElementMixin: (base: typeof HTMLElement) =>
    class extends base {
      consumeContext(): void {}
      observe(): void {}
    },
}));

vi.mock("@shared/utils/formatting.js", () => ({
  formatCurrency: () => "",
}));

vi.mock("@shared/utils/navigation.js", () => ({
  getProductDetailHref: () => "section/merchello/workspace/merchello-products/edit/products/product-1",
}));

vi.mock("@shared/styles/badge.styles.js", () => ({
  badgeStyles: "",
}));

vi.mock("@shared/components/warning-popover.element.js", () => ({}));

import { MerchelloProductTableElement } from "@products/components/product-table.element.js";

function createProduct(): ProductListItemDto {
  return { id: "product-1", productRootId: "root-1" } as ProductListItemDto;
}

describe("product table row click behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not dispatch product-click for anchor clicks", () => {
    const element = new MerchelloProductTableElement();
    const dispatchSpy = vi.spyOn(element, "dispatchEvent");
    const anchor = document.createElement("a");
    const anchorClickEvent = { composedPath: () => [anchor] } as unknown as Event;

    (element as unknown as { _handleRowClick(e: Event, product: ProductListItemDto): void })._handleRowClick(
      anchorClickEvent,
      createProduct()
    );

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("dispatches product-click once for non-anchor row clicks when clickable", () => {
    const element = new MerchelloProductTableElement();
    element.clickable = true;
    const dispatchSpy = vi.spyOn(element, "dispatchEvent");
    const rowClickEvent = { composedPath: () => [document.createElement("div")] } as unknown as Event;

    (element as unknown as { _handleRowClick(e: Event, product: ProductListItemDto): void })._handleRowClick(
      rowClickEvent,
      createProduct()
    );

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const emittedEvent = dispatchSpy.mock.calls[0][0] as CustomEvent<{ productId: string }>;
    expect(emittedEvent.type).toBe("product-click");
    expect(emittedEvent.detail.productId).toBe("root-1");
  });

  it("does not dispatch product-click when table is not clickable", () => {
    const element = new MerchelloProductTableElement();
    element.clickable = false;
    const dispatchSpy = vi.spyOn(element, "dispatchEvent");
    const rowClickEvent = { composedPath: () => [document.createElement("div")] } as unknown as Event;

    (element as unknown as { _handleRowClick(e: Event, product: ProductListItemDto): void })._handleRowClick(
      rowClickEvent,
      createProduct()
    );

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("product table checkbox accessibility markup", () => {
  it("uses aria-label for select-all checkbox without visible label text", () => {
    const element = new MerchelloProductTableElement();
    const headerMarkup = (
      element as unknown as { _renderHeaderCell(column: "select"): string }
    )._renderHeaderCell("select");

    expect(headerMarkup).toContain('aria-label="Select all products"');
    expect(headerMarkup).not.toMatch(/(?:^|\s)label="Select all products"/);
  });

  it("uses aria-label for row checkbox without visible label text", () => {
    const element = new MerchelloProductTableElement();
    const product = {
      ...createProduct(),
      rootName: "Art Print Poster",
    } as ProductListItemDto;
    const rowMarkup = (
      element as unknown as { _renderCell(product: ProductListItemDto, column: "select"): string }
    )._renderCell(product, "select");

    expect(rowMarkup).toContain('aria-label="Select Art Print Poster"');
    expect(rowMarkup).not.toMatch(/(?:^|\s)label="Select Art Print Poster"/);
  });
});
