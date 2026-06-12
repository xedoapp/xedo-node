import { setupServer } from 'msw/node';

/** Shared MSW server. Handlers are registered per-test via `server.use(...)`. */
export const server = setupServer();

/** Base URL the test client points at (must match the handlers below). */
export const BASE = 'https://api.xedo.test/marketplace';
