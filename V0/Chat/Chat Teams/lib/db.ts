import { Pool, type QueryResult, type QueryResultRow } from "pg"

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

/**
 * Singleton pool de conexões PostgreSQL.
 * Configure DATABASE_URL nas variáveis de ambiente do projeto.
 *
 * Exemplo:
 *   DATABASE_URL=postgres://user:pass@host:5432/zyntra
 *   DATABASE_SSL=false   # opcional, default = true (rejectUnauthorized:false)
 */
function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não configurada. Defina nas variáveis de ambiente do projeto.",
    )
  }
  const useSsl = process.env.DATABASE_SSL !== "false"
  return new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
  })
}

export function getPool(): Pool {
  if (!global.__pgPool) {
    global.__pgPool = createPool()
  }
  return global.__pgPool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const pool = getPool()
  return pool.query<T>(text, params as never)
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}
