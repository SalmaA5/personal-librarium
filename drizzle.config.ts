/// <reference types="node" />
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: './apps/api/.env.local' });

export default defineConfig({
  schema: './apps/api/src/db/schema.ts',
  out: './apps/api/src/db/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env['TURSO_URL']!,
    authToken: process.env['TURSO_AUTH_TOKEN'],
  },
});
