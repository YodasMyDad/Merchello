import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderListItemDto } from "@orders/types/order.types.js";

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
  formatRelativeDate: () => "",
  formatItemCount: () => "",
}));

vi.mock("@shared/utils/navigation.js", () => ({
  getOrderDetailHref: () => "section/merchello/workspace/merchello-orders/edit/orders/order-1",
}));

vi.mock("@shared/styles/badge.styles.js", () => ({
  badgeStyles: "",
}));

import { MerchelloOrderTableElement } from "@orders/components/order-table.element.js";

function createOrder(): OrderListItemDto {
  return { id: "order-1" } as OrderListItemDto;
}

describe("order table row click behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not dispatch order-click for anchor clicks", () => {
    const element = new MerchelloOrderTableElement();
    const dispatchSpy = vi.spyOn(element, "dispatchEvent");
    const anchor = document.createElement("a");
    const anchorClickEvent = { composedPath: () => [anchor] } as unknown as Event;

    (element as unknown as { _handleRowClick(e: Event, order: OrderListItemDto): void })._handleRowClick(
      anchorClickEvent,
      createOrder()
    );

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("dispatches order-click once for non-anchor row clicks when clickable", () => {
    const element = new MerchelloOrderTableElement();
    element.clickable = true;
    const dispatchSpy = vi.spyOn(element, "dispatchEvent");
    const rowClickEvent = { composedPath: () => [document.createElement("div")] } as unknown as Event;

    (element as unknown as { _handleRowClick(e: Event, order: OrderListItemDto): void })._handleRowClick(
      rowClickEvent,
      createOrder()
    );

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const emittedEvent = dispatchSpy.mock.calls[0][0] as CustomEvent<{ orderId: string }>;
    expect(emittedEvent.type).toBe("order-click");
    expect(emittedEvent.detail.orderId).toBe("order-1");
  });

  it("does not dispatch order-click when table is not clickable", () => {
    const element = new MerchelloOrderTableElement();
    element.clickable = false;
    const dispatchSpy = vi.spyOn(element, "dispatchEvent");
    const rowClickEvent = { composedPath: () => [document.createElement("div")] } as unknown as Event;

    (element as unknown as { _handleRowClick(e: Event, order: OrderListItemDto): void })._handleRowClick(
      rowClickEvent,
      createOrder()
    );

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
