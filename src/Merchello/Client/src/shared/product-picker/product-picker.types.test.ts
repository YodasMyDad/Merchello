import { describe, it, expect } from "vitest";
import type { ProductVariantDto } from "@products/types/product.types.js";
import {
  formatPrice,
  formatPriceRange,
  buildOptionValuesDisplay,
  getVariantImageUrl,
} from "@shared/product-picker/product-picker.types.js";

function createVariant(overrides: Partial<ProductVariantDto> = {}): ProductVariantDto {
  return {
    id: "variant-1",
    name: null,
    images: [],
    excludeRootProductImages: false,
    ...overrides,
  } as ProductVariantDto;
}

describe("product picker helper utilities", () => {
  describe("formatPrice", () => {
    it("formats price with currency symbol", () => {
      const value = formatPrice(1234.5, "£");
      expect(value).toContain("£");
      expect(value).toMatch(/1.*234.*50/);
    });
  });

  describe("formatPriceRange", () => {
    it("returns N/A when both min and max are null", () => {
      expect(formatPriceRange(null, null, "£")).toBe("N/A");
    });

    it("returns a single price when min equals max", () => {
      const value = formatPriceRange(19.99, 19.99, "$");
      expect(value).toContain("$");
      expect(value).not.toContain(" - ");
    });

    it("returns a single price when only max exists", () => {
      const value = formatPriceRange(null, 25, "$");
      expect(value).toContain("$");
      expect(value).toMatch(/25\.00/);
    });

    it("returns a range when min and max differ", () => {
      const value = formatPriceRange(10, 25, "$");
      expect(value).toContain(" - ");
      expect(value).toMatch(/\$.*10\.00/);
      expect(value).toMatch(/25\.00/);
    });
  });

  describe("buildOptionValuesDisplay", () => {
    it("returns variant name when present", () => {
      const result = buildOptionValuesDisplay(createVariant({ name: "Blue / Large" }));
      expect(result).toBe("Blue / Large");
    });

    it("returns null when variant name is missing", () => {
      const result = buildOptionValuesDisplay(createVariant({ name: null }));
      expect(result).toBeNull();
    });
  });

  describe("getVariantImageUrl", () => {
    it("prefers variant image when available and root images are not excluded", () => {
      const result = getVariantImageUrl(
        createVariant({
          images: ["variant.jpg"],
          excludeRootProductImages: false,
        }),
        ["root.jpg"]
      );

      expect(result).toBe("variant.jpg");
    });

    it("falls back to root image when variant has no image", () => {
      const result = getVariantImageUrl(
        createVariant({
          images: [],
          excludeRootProductImages: false,
        }),
        ["root.jpg"]
      );

      expect(result).toBe("root.jpg");
    });

    it("uses variant image when root images are excluded", () => {
      const result = getVariantImageUrl(
        createVariant({
          images: ["variant.jpg"],
          excludeRootProductImages: true,
        }),
        ["root.jpg"]
      );

      expect(result).toBe("variant.jpg");
    });

    it("returns null when no image sources are available", () => {
      const result = getVariantImageUrl(
        createVariant({
          images: [],
          excludeRootProductImages: true,
        }),
        []
      );

      expect(result).toBeNull();
    });
  });
});
