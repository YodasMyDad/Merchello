import { describe, it, expect } from "vitest";
import type { ProductOptionDto, ProductVariantDto } from "@products/types/product.types.js";
import {
  getVariantOptionDescription,
  calculateEstimatedVariantCount,
  isSingleVariantProduct,
  hasVariantWarnings,
  hasOptionWarnings,
  formatUrlAsBreadcrumb,
} from "@products/utils/variant-helpers.js";

function createVariant(overrides: Partial<ProductVariantDto> = {}): ProductVariantDto {
  return {
    id: "variant-1",
    sku: "SKU-001",
    price: 10,
    variantOptionsKey: null,
    ...overrides,
  } as ProductVariantDto;
}

function createOption(overrides: Partial<ProductOptionDto> = {}): ProductOptionDto {
  return {
    id: "option-1",
    name: "Option",
    alias: null,
    sortOrder: 0,
    optionTypeAlias: null,
    optionUiAlias: null,
    isVariant: true,
    isMultiSelect: false,
    values: [],
    ...overrides,
  };
}

describe("variant helper utilities", () => {
  describe("getVariantOptionDescription", () => {
    it("returns null when no variant options key exists", () => {
      const result = getVariantOptionDescription(createVariant({ variantOptionsKey: null }), []);
      expect(result).toBeNull();
    });

    it("maps GUID values to option names", () => {
      const redId = "11111111-1111-1111-1111-111111111111";
      const largeId = "22222222-2222-2222-2222-222222222222";

      const options: ProductOptionDto[] = [
        createOption({
          name: "Color",
          values: [
            {
              id: redId,
              name: "Red",
              fullName: null,
              sortOrder: 0,
              hexValue: null,
              mediaKey: null,
              priceAdjustment: 0,
              costAdjustment: 0,
              skuSuffix: null,
              weightKg: null,
            },
          ],
        }),
        createOption({
          name: "Size",
          values: [
            {
              id: largeId,
              name: "Large",
              fullName: null,
              sortOrder: 0,
              hexValue: null,
              mediaKey: null,
              priceAdjustment: 0,
              costAdjustment: 0,
              skuSuffix: null,
              weightKg: null,
            },
          ],
        }),
      ];

      const variant = createVariant({
        variantOptionsKey: `${redId}-${largeId}`,
      });

      const result = getVariantOptionDescription(variant, options);
      expect(result).toBe("Red / Large");
    });

    it("returns null when no GUIDs can be resolved", () => {
      const variant = createVariant({
        variantOptionsKey: "33333333-3333-3333-3333-333333333333",
      });

      const result = getVariantOptionDescription(variant, []);
      expect(result).toBeNull();
    });
  });

  describe("calculateEstimatedVariantCount", () => {
    it("returns zero when no variant options exist", () => {
      const count = calculateEstimatedVariantCount([createOption({ isVariant: false })]);
      expect(count).toBe(0);
    });

    it("multiplies variant option value counts", () => {
      const options: ProductOptionDto[] = [
        createOption({
          isVariant: true,
          values: [
            {
              id: "value-1",
              name: "Red",
              fullName: null,
              sortOrder: 0,
              hexValue: null,
              mediaKey: null,
              priceAdjustment: 0,
              costAdjustment: 0,
              skuSuffix: null,
              weightKg: null,
            },
            {
              id: "value-2",
              name: "Blue",
              fullName: null,
              sortOrder: 1,
              hexValue: null,
              mediaKey: null,
              priceAdjustment: 0,
              costAdjustment: 0,
              skuSuffix: null,
              weightKg: null,
            },
          ],
        }),
        createOption({
          isVariant: true,
          values: [
            {
              id: "value-3",
              name: "Small",
              fullName: null,
              sortOrder: 0,
              hexValue: null,
              mediaKey: null,
              priceAdjustment: 0,
              costAdjustment: 0,
              skuSuffix: null,
              weightKg: null,
            },
            {
              id: "value-4",
              name: "Large",
              fullName: null,
              sortOrder: 1,
              hexValue: null,
              mediaKey: null,
              priceAdjustment: 0,
              costAdjustment: 0,
              skuSuffix: null,
              weightKg: null,
            },
            {
              id: "value-5",
              name: "XL",
              fullName: null,
              sortOrder: 2,
              hexValue: null,
              mediaKey: null,
              priceAdjustment: 0,
              costAdjustment: 0,
              skuSuffix: null,
              weightKg: null,
            },
          ],
        }),
        createOption({
          isVariant: false,
          values: [
            {
              id: "value-6",
              name: "Gift Wrap",
              fullName: null,
              sortOrder: 0,
              hexValue: null,
              mediaKey: null,
              priceAdjustment: 0,
              costAdjustment: 0,
              skuSuffix: null,
              weightKg: null,
            },
          ],
        }),
      ];

      const count = calculateEstimatedVariantCount(options);
      expect(count).toBe(6);
    });
  });

  describe("variant warnings", () => {
    it("detects single variant products", () => {
      expect(isSingleVariantProduct([createVariant()])).toBe(true);
      expect(isSingleVariantProduct([createVariant(), createVariant({ id: "variant-2" })])).toBe(false);
    });

    it("flags variants missing SKU or with zero price", () => {
      expect(hasVariantWarnings([createVariant({ sku: "", price: 10 })])).toBe(true);
      expect(hasVariantWarnings([createVariant({ sku: "SKU-1", price: 0 })])).toBe(true);
      expect(hasVariantWarnings([createVariant({ sku: "SKU-1", price: 10 })])).toBe(false);
    });

    it("flags option warnings when variant count implies missing options", () => {
      expect(hasOptionWarnings(2, 0)).toBe(true);
      expect(hasOptionWarnings(1, 0)).toBe(false);
      expect(hasOptionWarnings(2, 1)).toBe(false);
    });
  });

  describe("formatUrlAsBreadcrumb", () => {
    it("formats valid URLs into breadcrumb-style output", () => {
      const result = formatUrlAsBreadcrumb("https://example.com/products/blue-shirt");
      expect(result).toContain("example.com");
      expect(result).toContain("products");
      expect(result).toContain("blue-shirt");
    });

    it("returns hostname for URLs without path segments", () => {
      expect(formatUrlAsBreadcrumb("https://example.com/")).toBe("example.com");
    });

    it("returns original value when URL parsing fails", () => {
      expect(formatUrlAsBreadcrumb("not-a-url")).toBe("not-a-url");
    });
  });
});
