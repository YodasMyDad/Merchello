import { vi } from "vitest";

/**
 * Mock modal manager context for testing modal interactions.
 */
export function createMockModalManager() {
  const mockModal = {
    onSubmit: vi.fn(() => Promise.resolve(undefined)),
    close: vi.fn(),
  };

  return {
    open: vi.fn(() => mockModal),
    mockModal,
  };
}

/**
 * Mock notification context for testing notification dispatches.
 */
export function createMockNotificationContext() {
  return {
    peek: vi.fn(),
    open: vi.fn(),
  };
}
