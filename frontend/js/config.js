// Local development uses the Express server; production uses Cloudflare Workers.
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
export const API_BASE_URL = isLocal
  ? 'http://localhost:8787'
  : 'https://earthwave-api.mouatassimmohamedamine-dev.workers.dev';
