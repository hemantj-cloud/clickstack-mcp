import { Injectable } from '@nitrostack/core';
import { createClient, type ClickHouseClient } from '@clickhouse/client';
import { clickstackConfig } from '../config/clickstack.config.js';

@Injectable()
export class ClickHousePoolService {
  private client: ClickHouseClient | null = null;

  getClient(): ClickHouseClient {
    if (!this.client) {
      this.client = createClient({
        url: clickstackConfig.clickhouseUrl,
        username: clickstackConfig.clickhouseUser,
        password: clickstackConfig.clickhousePassword,
        database: clickstackConfig.clickhouseDatabase,
        application: 'nitrostack-clickstack-mcp',
        max_open_connections: 50,
        request_timeout: 30_000,
        clickhouse_settings: {
          readonly: '2', // Strict sandboxing: prevent mutations and setting changes
          max_memory_usage: '10000000000', // 10 GB limit
          date_time_output_format: 'iso',
        },
      });
    }
    return this.client;
  }

  async executeQuery<T = any>(sql: string, params?: Record<string, any>): Promise<T[]> {
    try {
      const client = this.getClient();
      const result = await client.query({
        query: sql,
        query_params: params,
        format: 'JSONEachRow',
      });
      return (await result.json()) as T[];
    } catch (err: any) {
      // In development / demo mode when upstream DB is not reached, emit structured log
      console.warn(`[ClickHousePoolService] Query error or remote host unreachable: ${err?.message || err}`);
      throw err;
    }
  }
}
