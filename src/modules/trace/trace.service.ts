import { Injectable } from '@nitrostack/core';
import { MOCK_TRACE_WATERFALL } from '../clickstack.data.js';
import { ClickHousePoolService } from '../../services/clickhouse-pool.service.js';

@Injectable({ deps: [ClickHousePoolService] })
export class TraceService {
  constructor(private readonly clickhousePool: ClickHousePoolService) {}

  async fetchTraceWaterfall(input: any) {
    // If specific traceId is passed or auto-picked
    return {
      ...MOCK_TRACE_WATERFALL,
      sourceId: input.sourceId,
      traceId: input.traceId || MOCK_TRACE_WATERFALL.traceId,
    };
  }

  async fetchTopTimeConsumingOperations(input: any) {
    return {
      sourceId: input.sourceId,
      parentFilter: input.parentFilter,
      totalTracesAnalyzed: 14200,
      operations: [
        {
          operationName: 'postgres.query: inventory_lock',
          serviceName: 'inventory-service',
          totalDurationMs: 31200420,
          percentageOfTotalTime: 68.4,
          averageDurationMs: 2197.2,
          callCount: 14200,
        },
        {
          operationName: 'stripe.api: POST /v1/charges',
          serviceName: 'payment-service',
          totalDurationMs: 1704000,
          percentageOfTotalTime: 3.7,
          averageDurationMs: 120.0,
          callCount: 14200,
        },
        {
          operationName: 'auth.verify: POST /v1/tokens/verify',
          serviceName: 'auth-service',
          totalDurationMs: 641840,
          percentageOfTotalTime: 1.4,
          averageDurationMs: 45.2,
          callCount: 14200,
        },
      ],
    };
  }
}
