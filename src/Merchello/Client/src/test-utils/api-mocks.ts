import { vi } from "vitest";

export interface MockApiResponse<T> {
  data?: T;
  error?: Error;
}

export function mockApiSuccess<T>(data: T): MockApiResponse<T> {
  return { data };
}

export function mockApiError(message: string): MockApiResponse<never> {
  return { error: new Error(message) };
}

export function createMockFetch<T>(response: T, ok = true) {
  return vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    } as Response)
  );
}
