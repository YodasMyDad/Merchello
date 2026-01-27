import { describe, it, expect } from "vitest";
import { generateCsv, formatDateForCsv, type CsvColumn } from "./csv.js";

describe("csv utilities", () => {
  describe("generateCsv", () => {
    it("generates header row from column definitions", () => {
      const columns: CsvColumn<{ name: string }>[] = [{ header: "Name", accessor: (item) => item.name }];
      const result = generateCsv([], columns);
      expect(result).toBe("Name");
    });

    it("generates multiple headers separated by commas", () => {
      interface Item {
        id: string;
        name: string;
      }
      const columns: CsvColumn<Item>[] = [
        { header: "ID", accessor: (item) => item.id },
        { header: "Name", accessor: (item) => item.name },
      ];
      const result = generateCsv([], columns);
      expect(result).toBe("ID,Name");
    });

    it("generates data rows from items", () => {
      interface Order {
        id: string;
        total: number;
      }
      const columns: CsvColumn<Order>[] = [
        { header: "Order ID", accessor: (item) => item.id },
        { header: "Total", accessor: (item) => item.total },
      ];
      const data: Order[] = [
        { id: "ORD-001", total: 99.99 },
        { id: "ORD-002", total: 149.5 },
      ];

      const result = generateCsv(data, columns);
      const lines = result.split("\n");

      expect(lines[0]).toBe("Order ID,Total");
      expect(lines[1]).toBe("ORD-001,99.99");
      expect(lines[2]).toBe("ORD-002,149.5");
    });

    it("escapes values containing commas", () => {
      const columns: CsvColumn<{ name: string }>[] = [{ header: "Name", accessor: (item) => item.name }];
      const data = [{ name: "Smith, John" }];

      const result = generateCsv(data, columns);
      expect(result).toContain('"Smith, John"');
    });

    it("escapes values containing quotes", () => {
      const columns: CsvColumn<{ desc: string }>[] = [{ header: "Description", accessor: (item) => item.desc }];
      const data = [{ desc: 'Product "Deluxe"' }];

      const result = generateCsv(data, columns);
      expect(result).toContain('"Product ""Deluxe"""');
    });

    it("escapes values containing newlines", () => {
      const columns: CsvColumn<{ address: string }>[] = [{ header: "Address", accessor: (item) => item.address }];
      const data = [{ address: "123 Main St\nApt 4B" }];

      const result = generateCsv(data, columns);
      expect(result).toContain('"123 Main St\nApt 4B"');
    });

    it("handles null values as empty strings", () => {
      const columns: CsvColumn<{ value: string | null }>[] = [{ header: "Value", accessor: (item) => item.value }];
      const data = [{ value: null }];

      const result = generateCsv(data, columns);
      const lines = result.split("\n");
      expect(lines[1]).toBe("");
    });

    it("handles undefined values as empty strings", () => {
      const columns: CsvColumn<{ value: string | undefined }>[] = [
        { header: "Value", accessor: (item) => item.value },
      ];
      const data = [{ value: undefined }];

      const result = generateCsv(data, columns);
      const lines = result.split("\n");
      expect(lines[1]).toBe("");
    });

    it("escapes header values containing special characters", () => {
      const columns: CsvColumn<{ value: string }>[] = [
        { header: "Name, Full", accessor: (item) => item.value },
      ];
      const result = generateCsv([], columns);
      expect(result).toBe('"Name, Full"');
    });
  });

  describe("formatDateForCsv", () => {
    it("formats date in DD/MM/YYYY format", () => {
      const result = formatDateForCsv("2024-06-15T10:30:00Z");
      expect(result).toBe("15/06/2024");
    });

    it("handles dates at start of year", () => {
      const result = formatDateForCsv("2024-01-01T00:00:00Z");
      expect(result).toBe("01/01/2024");
    });

    it("handles dates at end of year", () => {
      const result = formatDateForCsv("2024-12-31T23:59:59Z");
      expect(result).toBe("31/12/2024");
    });
  });
});
