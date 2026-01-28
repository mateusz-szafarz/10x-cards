import { http } from 'msw';

// Default MSW handlers for API endpoints
// Handlers will be added in later phases as we implement specific tests
export const handlers: ReturnType<typeof http.get>[] = [];
