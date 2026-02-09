import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as navigation from "@shared/utils/navigation.js";

describe("navigation utilities", () => {
  describe("href builders", () => {
    it("builds a generic workspace href", () => {
      const href = navigation.getMerchelloWorkspaceHref("merchello-orders", "edit/orders/123");
      expect(href).toBe("section/merchello/workspace/merchello-orders/edit/orders/123");
    });

    it("builds expected section-specific hrefs", () => {
      expect(navigation.getOrderDetailHref("order-1")).toBe(
        "section/merchello/workspace/merchello-orders/edit/orders/order-1"
      );
      expect(navigation.getOrdersListHref()).toBe("section/merchello/workspace/merchello-orders/edit/orders");
      expect(navigation.getOutstandingListHref()).toBe(
        "section/merchello/workspace/merchello-outstanding/edit/outstanding"
      );

      expect(navigation.getProductDetailHref("product-1")).toBe(
        "section/merchello/workspace/merchello-products/edit/products/product-1"
      );
      expect(navigation.getProductVariantsTabHref("product-1")).toBe(
        "section/merchello/workspace/merchello-products/edit/products/product-1/tab/variants"
      );
      expect(navigation.getVariantDetailHref("product-1", "variant-1")).toBe(
        "section/merchello/workspace/merchello-products/edit/products/product-1/variant/variant-1"
      );
      expect(navigation.getProductsListHref()).toBe(
        "section/merchello/workspace/merchello-products/edit/products"
      );

      expect(navigation.getWarehouseDetailHref("warehouse-1")).toBe(
        "section/merchello/workspace/merchello-warehouses/edit/warehouses/warehouse-1"
      );
      expect(navigation.getWarehouseCreateHref()).toBe(
        "section/merchello/workspace/merchello-warehouses/edit/warehouses/create"
      );
      expect(navigation.getWarehousesListHref()).toBe(
        "section/merchello/workspace/merchello-warehouses/edit/warehouses"
      );

      expect(navigation.getSupplierDetailHref("supplier-1")).toBe(
        "section/merchello/workspace/merchello-suppliers/edit/suppliers/supplier-1"
      );
      expect(navigation.getSupplierCreateHref()).toBe(
        "section/merchello/workspace/merchello-suppliers/edit/suppliers/create"
      );
      expect(navigation.getSuppliersListHref()).toBe(
        "section/merchello/workspace/merchello-suppliers/edit/suppliers"
      );

      expect(navigation.getSegmentDetailHref("segment-1")).toBe(
        "section/merchello/workspace/merchello-customers/edit/customers/segment/segment-1"
      );
      expect(navigation.getSegmentCreateHref()).toBe(
        "section/merchello/workspace/merchello-customers/edit/customers/segment/create"
      );
      expect(navigation.getSegmentsListHref()).toBe(
        "section/merchello/workspace/merchello-customers/edit/customers/view/segments"
      );

      expect(navigation.getDiscountDetailHref("discount-1")).toBe(
        "section/merchello/workspace/merchello-discounts/edit/discounts/discount-1"
      );
      expect(navigation.getDiscountCreateHref(3)).toBe(
        "section/merchello/workspace/merchello-discounts/edit/discounts/create?category=3"
      );
      expect(navigation.getDiscountsListHref()).toBe(
        "section/merchello/workspace/merchello-discounts/edit/discounts"
      );

      expect(navigation.getEmailDetailHref("email-1")).toBe(
        "section/merchello/workspace/merchello-emails/edit/emails/email-1"
      );
      expect(navigation.getEmailCreateHref()).toBe(
        "section/merchello/workspace/merchello-emails/edit/emails/create"
      );
      expect(navigation.getEmailsListHref()).toBe(
        "section/merchello/workspace/merchello-emails/edit/emails"
      );

      expect(navigation.getUpsellDetailHref("upsell-1")).toBe(
        "section/merchello/workspace/merchello-upsells/edit/upsells/upsell-1"
      );
      expect(navigation.getUpsellCreateHref()).toBe(
        "section/merchello/workspace/merchello-upsells/edit/upsells/create"
      );
      expect(navigation.getUpsellsListHref()).toBe(
        "section/merchello/workspace/merchello-upsells/edit/upsells"
      );
    });
  });

  describe("programmatic navigation", () => {
    let pushStateSpy: ReturnType<typeof vi.spyOn>;
    let replaceStateSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      pushStateSpy = vi.spyOn(history, "pushState");
      replaceStateSpy = vi.spyOn(history, "replaceState");
    });

    afterEach(() => {
      pushStateSpy.mockRestore();
      replaceStateSpy.mockRestore();
    });

    it("uses pushState for navigation helpers", () => {
      navigation.navigateToOrderDetail("order-1");
      expect(pushStateSpy).toHaveBeenLastCalledWith(
        {},
        "",
        "section/merchello/workspace/merchello-orders/edit/orders/order-1"
      );

      navigation.navigateToVariantDetail("product-1", "variant-1");
      expect(pushStateSpy).toHaveBeenLastCalledWith(
        {},
        "",
        "section/merchello/workspace/merchello-products/edit/products/product-1/variant/variant-1"
      );

      navigation.navigateToProductsList();
      expect(pushStateSpy).toHaveBeenLastCalledWith(
        {},
        "",
        "section/merchello/workspace/merchello-products/edit/products"
      );

      navigation.navigateToWarehouseCreate();
      expect(pushStateSpy).toHaveBeenLastCalledWith(
        {},
        "",
        "section/merchello/workspace/merchello-warehouses/edit/warehouses/create"
      );

      navigation.navigateToSegmentDetail("segment-1");
      expect(pushStateSpy).toHaveBeenLastCalledWith(
        {},
        "",
        "section/merchello/workspace/merchello-customers/edit/customers/segment/segment-1"
      );

      navigation.navigateToDiscountCreate("2");
      expect(pushStateSpy).toHaveBeenLastCalledWith(
        {},
        "",
        "section/merchello/workspace/merchello-discounts/edit/discounts/create?category=2"
      );

      navigation.navigateToEmailDetail("email-1");
      expect(pushStateSpy).toHaveBeenLastCalledWith(
        {},
        "",
        "section/merchello/workspace/merchello-emails/edit/emails/email-1"
      );

      navigation.navigateToUpsellCreate();
      expect(pushStateSpy).toHaveBeenLastCalledWith(
        {},
        "",
        "section/merchello/workspace/merchello-upsells/edit/upsells/create"
      );
    });

    it("uses replaceState for replacement helpers", () => {
      navigation.replaceToDiscountDetail("discount-1");
      expect(replaceStateSpy).toHaveBeenLastCalledWith(
        {},
        "",
        "section/merchello/workspace/merchello-discounts/edit/discounts/discount-1"
      );

      navigation.replaceToUpsellDetail("upsell-1");
      expect(replaceStateSpy).toHaveBeenLastCalledWith(
        {},
        "",
        "section/merchello/workspace/merchello-upsells/edit/upsells/upsell-1"
      );
    });
  });
});
