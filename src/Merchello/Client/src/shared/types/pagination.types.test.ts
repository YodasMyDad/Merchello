import { describe, it, expect } from "vitest";
import {
  toPaginationState,
  getPaginationRangeText,
  hasPreviousPage,
  hasNextPage,
  type PaginatedResponse,
} from "@shared/types/pagination.types.js";

describe("pagination utilities", () => {
  it("maps a paginated response to pagination state", () => {
    const response: PaginatedResponse<string> = {
      items: ["a", "b"],
      pageIndex: 3,
      totalPages: 8,
      totalItems: 157,
    };

    const state = toPaginationState(response, 20);

    expect(state).toEqual({
      page: 3,
      pageSize: 20,
      totalItems: 157,
      totalPages: 8,
    });
  });

  it("shows zero text when there are no items", () => {
    const text = getPaginationRangeText({
      page: 1,
      pageSize: 50,
      totalItems: 0,
      totalPages: 0,
    });

    expect(text).toBe("0 items");
  });

  it("formats a full page range", () => {
    const text = getPaginationRangeText({
      page: 2,
      pageSize: 50,
      totalItems: 200,
      totalPages: 4,
    });

    expect(text).toBe("51-100 of 200");
  });

  it("formats a partial last-page range", () => {
    const text = getPaginationRangeText({
      page: 5,
      pageSize: 25,
      totalItems: 107,
      totalPages: 5,
    });

    expect(text).toBe("101-107 of 107");
  });

  it("reports previous/next page availability", () => {
    const firstPage = { page: 1, pageSize: 25, totalItems: 100, totalPages: 4 };
    const middlePage = { page: 2, pageSize: 25, totalItems: 100, totalPages: 4 };
    const lastPage = { page: 4, pageSize: 25, totalItems: 100, totalPages: 4 };

    expect(hasPreviousPage(firstPage)).toBe(false);
    expect(hasPreviousPage(middlePage)).toBe(true);

    expect(hasNextPage(middlePage)).toBe(true);
    expect(hasNextPage(lastPage)).toBe(false);
  });
});
