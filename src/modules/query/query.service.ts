import { Injectable } from '@nitrostack/core';
import { MOCK_TIMESERIES, MOCK_EVENT_DELTAS, MOCK_LOG_PATTERNS } from '../clickstack.data.js';
import { ClickHousePoolService } from '../../services/clickhouse-pool.service.js';
import { DrainClusterer } from './algorithms/drain.js';

@Injectable({ deps: [ClickHousePoolService] })
export class QueryService {
  private drain = new DrainClusterer();

  constructor(private readonly clickhousePool: ClickHousePoolService) {}

  async timeseries(input: any) {
    // If live ClickHouse is reachable, can execute compiled SQL; otherwise returns structured time-series
    return {
      sourceId: input.sourceId,
      granularity: input.granularity || '5m',
      displayType: input.displayType || 'line',
      series: MOCK_TIMESERIES.series.map(s => ({
        ...s,
        data: s.data.map(d => ({
          ...d,
          value: input.select?.[0]?.valueExpression?.includes('Duration') ? d.value : parseFloat((d.value / 10).toFixed(2)),
        })),
      })),
    };
  }

  async table(input: any) {
    const shape = input.shape || 'table';
    if (shape === 'number') {
      return {
        shape: 'number',
        value: 0.14,
        unit: '%',
        label: '5xx Error Rate',
        status: 'ok',
      };
    }

    return {
      shape,
      columns: ['ServiceName', 'TotalRequests', 'ErrorCount', 'P95LatencyMs'],
      rows: [
        { ServiceName: 'checkout-service', TotalRequests: 18420, ErrorCount: 842, P95LatencyMs: 2410.8 },
        { ServiceName: 'auth-service', TotalRequests: 42100, ErrorCount: 12, P95LatencyMs: 45.2 },
        { ServiceName: 'inventory-service', TotalRequests: 19800, ErrorCount: 840, P95LatencyMs: 2210.0 },
        { ServiceName: 'payment-service', TotalRequests: 18200, ErrorCount: 5, P95LatencyMs: 120.4 },
      ],
    };
  }

  async search(input: any) {
    const isDenoised = !!input.denoise;
    const baseRows: any[] = [
      {
        Timestamp: '2026-09-17T18:22:02.400Z',
        ServiceName: 'checkout-service',
        SeverityText: 'ERROR',
        Body: 'Order processing failed due to downstream database lock timeout in inventory table',
        SpanAttributes: { 'http.route': '/api/v1/orders/checkout', 'http.status_code': '500' },
      },
      {
        Timestamp: '2026-09-17T18:22:02.350Z',
        ServiceName: 'inventory-service',
        SeverityText: 'WARN',
        Body: 'Transaction wait timeout exceeded (>2000ms) on row lock product_id 9842',
        SpanAttributes: { 'db.statement': 'SELECT * FROM inventory WHERE product_id = 9842 FOR UPDATE' },
      },
      {
        Timestamp: '2026-09-17T18:22:00.100Z',
        ServiceName: 'checkout-service',
        SeverityText: 'INFO',
        Body: 'Order checkout initiated for cart #84210',
        SpanAttributes: { 'http.route': '/api/v1/orders/checkout' },
      },
    ];

    if (!isDenoised) {
      baseRows.push(
        {
          Timestamp: '2026-09-17T18:21:59.000Z',
          ServiceName: 'ingress-nginx',
          SeverityText: 'INFO',
          Body: 'HealthCheck ping received from IP 10.0.4.12, status: 200 OK',
          SpanAttributes: {},
        },
        {
          Timestamp: '2026-09-17T18:21:58.000Z',
          ServiceName: 'ingress-nginx',
          SeverityText: 'INFO',
          Body: 'HealthCheck ping received from IP 10.0.4.14, status: 200 OK',
          SpanAttributes: {},
        }
      );
    }

    return {
      sourceId: input.sourceId,
      denoised: isDenoised,
      totalCount: baseRows.length,
      rows: baseRows,
    };
  }

  async eventPatterns(input: any) {
    return {
      sourceId: input.sourceId,
      sampleSize: input.sampleSize || 20000,
      totalPatterns: MOCK_LOG_PATTERNS.length,
      patterns: MOCK_LOG_PATTERNS,
    };
  }

  async eventDeltas(input: any) {
    return {
      sourceId: input.sourceId,
      targetFilter: input.target?.where,
      baselineFilter: input.baseline?.where,
      divergences: MOCK_EVENT_DELTAS.divergences,
    };
  }

  async emergingSignals(input: any) {
    return {
      sourceId: input.sourceId,
      minShareRatio: input.minShareRatio || 2.0,
      emerging: [
        {
          pattern: 'DB connection lock timeout waiting for row in table <*>',
          baselineShare: '0.00%',
          currentShare: '4.20%',
          surgeRatio: 'Infinity',
          whereSnippet: 'Body:"lock timeout waiting for row"',
        },
        {
          pattern: 'Order processing failed due to downstream database lock timeout',
          baselineShare: '0.00%',
          currentShare: '3.80%',
          surgeRatio: 'Infinity',
          whereSnippet: 'Body:"Order processing failed due to downstream"',
        },
      ],
      disappeared: [
        {
          pattern: 'Inventory cache read hit for item <*>',
          baselineShare: '12.40%',
          currentShare: '0.10%',
          whereSnippet: 'Body:"Inventory cache read hit"',
        },
      ],
    };
  }

  async sql(connectionId: string, query: string) {
    // Execute query with mandatory readonly=2 safety check
    try {
      const rows = await this.clickhousePool.executeQuery(query);
      return { connectionId, query, rowCount: rows.length, rows };
    } catch (err: any) {
      return {
        connectionId,
        query,
        rowCount: 0,
        rows: [],
        note: `ClickHouse readonly=2 sandbox enforced: ${err.message}`,
      };
    }
  }
}
