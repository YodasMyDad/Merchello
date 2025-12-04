/**
 * Shared pagination types for all paginated API responses and components.
 * All paged queries return PaginatedResponse<T> from the server.
 */

/**
 * Generic paginated response interface matching PaginatedList<T> from the server
 */
export interface PaginatedResponse<T> {
  /** The items for the current page */
  items: T[];
  /** Current page index (1-based) */
  pageIndex: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items across all pages */
  totalItems: number;
}

/**
 * Pagination state used by list components
 */
export interface PaginationState {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Event detail for page change events
 */
export interface PageChangeEventDetail {
  /** The new page number (1-based) */
  page: number;
}

/**
 * Creates a PaginationState from a PaginatedResponse
 */
export function toPaginationState<T>(response: PaginatedResponse<T>, pageSize: number): PaginationState {
  return {
    page: response.pageIndex,
    pageSize: pageSize,
    totalItems: response.totalItems,
    totalPages: response.totalPages
  };
}

/**
 * Calculates the display range text (e.g., "1-50 of 200")
 */
export function getPaginationRangeText(state: PaginationState): string {
  if (state.totalItems === 0) {
    return "0 items";
  }
  const start = (state.page - 1) * state.pageSize + 1;
  const end = Math.min(state.page * state.pageSize, state.totalItems);
  return `${start}-${end} of ${state.totalItems}`;
}

/**
 * Checks if there is a previous page
 */
export function hasPreviousPage(state: PaginationState): boolean {
  return state.page > 1;
}

/**
 * Checks if there is a next page
 */
export function hasNextPage(state: PaginationState): boolean {
  return state.page < state.totalPages;
}

