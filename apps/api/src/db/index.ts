import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Retry wrapper for Turso cold-start: free-tier databases sleep after inactivity,
// and the first connection attempt times out before the wake-up completes.
// Retrying after a short delay lets the second attempt hit a warm database.
async function fetchWithColdStartRetry(
  url: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
): Promise<Response> {
  const TIMEOUT_MS = 30_000;
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt < MAX_RETRIES) {
        await new Promise<void>((r) => setTimeout(r, 5_000));
      } else {
        throw err;
      }
    }
  }
  throw new Error('unreachable');
}

export function createDrizzleClient(url: string, authToken?: string) {
  // Use https:// transport — WebSocket (libsql://) cold-start exceeds the 10s default timeout
  const resolvedUrl = url.startsWith('libsql://')
    ? url.replace('libsql://', 'https://')
    : url;
  const client = createClient({
    url: resolvedUrl,
    authToken,
    fetch: fetchWithColdStartRetry,
  });
  return drizzle(client, { schema });
}

export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
