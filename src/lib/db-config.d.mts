import type { PoolConfig } from "pg";
export function connectionConfig(env?: NodeJS.ProcessEnv): Pick<PoolConfig, "host" | "port" | "user" | "password" | "database" | "ssl" | "options"> & { host: string; port: number; database: string };
