import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as publicSchema from './schema/public';
import * as tenantSchema from './schema/tenant';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const globalForDb = globalThis as typeof globalThis & {
  __jalamandalaPubClient?: ReturnType<typeof postgres>;
  __jalamandalaTenantDbs?: Map<string, ReturnType<typeof drizzle<typeof tenantSchema>>>;
};

// Cache public client across hot reloads in dev
const queryClient =
  globalForDb.__jalamandalaPubClient ??
  postgres(process.env.DATABASE_URL, { max: 5, idle_timeout: 20 });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__jalamandalaPubClient = queryClient;
}

// Public schema client
export const db = drizzle(queryClient, { schema: publicSchema });

type TenantDb = ReturnType<typeof drizzle<typeof tenantSchema>>;

const tenantDbs = globalForDb.__jalamandalaTenantDbs ?? new Map<string, TenantDb>();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__jalamandalaTenantDbs = tenantDbs;
}

function assertValidSchemaName(schemaName: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName)) {
    throw new Error(`Invalid tenant schema name: ${schemaName}`);
  }
}

// Tenant schema client factory
export async function createTenantDb(schemaName: string) {
  assertValidSchemaName(schemaName);

  const cachedTenantDb = tenantDbs.get(schemaName);

  if (cachedTenantDb) {
    return cachedTenantDb;
  }

  const tenantClient = postgres(process.env.DATABASE_URL!, {
    connection: {
      options: `-c search_path=${schemaName},public`,
    },
    idle_timeout: 20,
    max: 3,
  });

  const tenantDb = drizzle(tenantClient, { schema: tenantSchema });
  tenantDbs.set(schemaName, tenantDb);

  return tenantDb;
}
