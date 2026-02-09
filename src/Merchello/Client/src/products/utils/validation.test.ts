import { describe, it, expect } from "vitest";
import {
  validateProductRoot,
  validateVariant,
  validateProductWithVariant,
  formatValidationErrorMessage,
} from "@products/utils/validation.js";

describe("product validation utilities", () => {
  describe("validateProductRoot", () => {
    it("passes when required fields are provided for a physical product", () => {
      const result = validateProductRoot({
        rootName: "Blue T-Shirt",
        taxGroupId: "tax-group-1",
        productTypeId: "type-1",
        warehouseIds: ["warehouse-1"],
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("returns required field errors when missing", () => {
      const result = validateProductRoot({
        rootName: " ",
        warehouseIds: [],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.rootName).toBe("Product name is required");
      expect(result.errors.taxGroupId).toBe("Tax group is required");
      expect(result.errors.productTypeId).toBe("Product type is required");
      expect(result.errors.warehouseIds).toBe("At least one warehouse is required for physical products");
    });

    it("does not require warehouses for digital products", () => {
      const result = validateProductRoot({
        rootName: "Digital Download",
        taxGroupId: "tax-group-1",
        productTypeId: "type-1",
        isDigitalProduct: true,
        warehouseIds: [],
      });

      expect(result.isValid).toBe(true);
      expect(result.errors.warehouseIds).toBeUndefined();
    });

    it("allows options to force digital validation behavior", () => {
      const result = validateProductRoot(
        {
          rootName: "Overridden Product",
          taxGroupId: "tax-group-1",
          productTypeId: "type-1",
          isDigitalProduct: false,
          warehouseIds: [],
        },
        { isDigitalProduct: true }
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.warehouseIds).toBeUndefined();
    });
  });

  describe("validateVariant", () => {
    it("passes when required and numeric fields are valid", () => {
      const result = validateVariant({
        sku: "SKU-001",
        price: 10,
        costOfGoods: 4.5,
        onSale: true,
        previousPrice: 12,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("requires SKU", () => {
      const result = validateVariant({ sku: " ", price: 10 });
      expect(result.isValid).toBe(false);
      expect(result.errors.sku).toBe("SKU is required");
    });

    it("rejects negative price and cost", () => {
      const result = validateVariant({
        sku: "SKU-001",
        price: -1,
        costOfGoods: -0.5,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.price).toBe("Price must be 0 or greater");
      expect(result.errors.costOfGoods).toBe("Cost of goods must be 0 or greater");
    });

    it("validates previous price only when on sale", () => {
      const result = validateVariant({
        sku: "SKU-001",
        price: 10,
        onSale: true,
        previousPrice: -1,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.previousPrice).toBe("Previous price must be 0 or greater");
    });
  });

  describe("validateProductWithVariant", () => {
    it("combines root and variant validation results", () => {
      const result = validateProductWithVariant(
        {
          rootName: "",
          warehouseIds: [],
        },
        {
          sku: "",
          price: -10,
        }
      );

      expect(result.productResult.isValid).toBe(false);
      expect(result.variantResult.isValid).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it("is valid only when both parts are valid", () => {
      const result = validateProductWithVariant(
        {
          rootName: "Product",
          taxGroupId: "tax-group-1",
          productTypeId: "type-1",
          warehouseIds: ["warehouse-1"],
        },
        {
          sku: "SKU-001",
          price: 12,
        }
      );

      expect(result.productResult.isValid).toBe(true);
      expect(result.variantResult.isValid).toBe(true);
      expect(result.isValid).toBe(true);
    });
  });

  describe("formatValidationErrorMessage", () => {
    it("returns null when no errors are present", () => {
      expect(formatValidationErrorMessage(false, false)).toBeNull();
    });

    it("formats message for product-level errors only", () => {
      expect(formatValidationErrorMessage(true, false)).toBe(
        "Please fix the errors on the Details tab before saving"
      );
    });

    it("formats message for variant-level errors only", () => {
      expect(formatValidationErrorMessage(false, true)).toBe(
        "Please fix the errors on the Basic Info tab before saving"
      );
    });

    it("formats message for combined errors", () => {
      expect(formatValidationErrorMessage(true, true)).toBe(
        "Please fix the errors on the Details and Basic Info tabs before saving"
      );
    });
  });
});
