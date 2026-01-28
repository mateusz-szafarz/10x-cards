import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { server } from './mocks/server';

// Cleanup React DOM after each test
afterEach(() => {
  cleanup();
});

// MSW setup — intercept fetch requests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock sonner globally — toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock window.location for redirect tests
const locationMock = {
  href: '',
  assign: vi.fn(),
  replace: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
});
