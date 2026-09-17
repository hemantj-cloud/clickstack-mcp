import { Injectable } from '@nitrostack/core';
import { ClickHousePoolService } from '../../services/clickhouse-pool.service.js';

@Injectable({ deps: [ClickHousePoolService] })
export class TraceService {
  constructor(private readonly clickhousePool: ClickHousePoolService) {}

  async fetchTraceWaterfall(input: any) {
    // If no traceId given, pick the most recent error trace
    let traceId = input.traceId;
    if (!traceId) {
      const latestError = await this.clickhousePool.executeQuery<{ TraceId: string }>(
        `SELECT TraceId FROM otel.otel_traces
         WHERE StatusCode = 'error' AND ParentSpanId = ''
         ORDER BY Timestamp DESC
         LIMIT 1`
      );
      traceId = latestError[0]?.TraceId;
    }

    if (!traceId) {
      return { traceId: null, spans: [], message: 'No traces found in ClickHouse' };
    }

    // Fetch all spans for the trace
    const spanRows = await this.clickhousePool.executeQuery<{
      SpanId: string;
      ParentSpanId: string;
      ServiceName: string;
      SpanName: string;
      SpanKind: string;
      StatusCode: string;
      StatusMessage: string;
      Duration: number;
      Timestamp: string;
      SpanAttributes: Record<string, string>;
      ResourceAttributes: Record<string, string>;
    }>(
      `SELECT
         SpanId, ParentSpanId, ServiceName, SpanName, SpanKind,
         StatusCode, StatusMessage, Duration,
         formatDateTime(Timestamp, '%Y-%m-%dT%H:%i:%S.%fZ') AS Timestamp,
         SpanAttributes, ResourceAttributes
       FROM otel.otel_traces
       WHERE TraceId = {traceId: String}
       ORDER BY Timestamp ASC`,
      { traceId }
    );

    // Fetch correlated logs for all spans in this trace
    const logRows = await this.clickhousePool.executeQuery<{
      SpanId: string;
      Timestamp: string;
      SeverityText: string;
      Body: string;
    }>(
      `SELECT
         SpanId,
         formatDateTime(Timestamp, '%Y-%m-%dT%H:%i:%S.%fZ') AS Timestamp,
         SeverityText,
         Body
       FROM otel.otel_logs
       WHERE TraceId = {traceId: String}
       ORDER BY Timestamp ASC`,
      { traceId }
    );

    // Build a log map keyed by SpanId
    const logsBySpan: Record<string, { timestamp: string; level: string; message: string }[]> = {};
    for (const log of logRows) {
      if (!logsBySpan[log.SpanId]) logsBySpan[log.SpanId] = [];
      logsBySpan[log.SpanId].push({
        timestamp: log.Timestamp,
        level: log.SeverityText,
        message: log.Body,
      });
    }

    // Compute start offset relative to root span
    const rootSpan = spanRows.find(s => s.ParentSpanId === '') ?? spanRows[0];
    const rootTs = rootSpan ? new Date(rootSpan.Timestamp).getTime() : 0;
    const rootDurationMs = rootSpan ? rootSpan.Duration / 1_000_000 : 0;

    const spans = spanRows.map(row => {
      const startMs = new Date(row.Timestamp).getTime() - rootTs;
      const durationMs = row.Duration / 1_000_000;
      return {
        spanId: row.SpanId,
        parentSpanId: row.ParentSpanId || null,
        serviceName: row.ServiceName,
        spanName: row.SpanName,
        spanKind: row.SpanKind,
        statusCode: row.StatusCode,
        statusMessage: row.StatusMessage,
        startOffsetMs: parseFloat(startMs.toFixed(3)),
        durationMs: parseFloat(durationMs.toFixed(3)),
        durationNs: row.Duration,
        attributes: row.SpanAttributes,
        resourceAttributes: row.ResourceAttributes,
        logs: logsBySpan[row.SpanId] ?? [],
      };
    });

    return {
      sourceId: input.sourceId,
      traceId,
      rootService: rootSpan?.ServiceName ?? null,
      durationMs: parseFloat(rootDurationMs.toFixed(3)),
      spanCount: spans.length,
      spans,
    };
  }

  async fetchTopTimeConsumingOperations(input: any) {
    const parentFilter = input.parentFilter;

    // Build optional WHERE filter from parentFilter string (e.g. SpanName:"POST /api/...")
    // For simplicity, support basic SpanName:"..." filter pattern
    let whereClause = '';
    if (parentFilter) {
      const match = parentFilter.match(/SpanName:\\?"([^"\\]+)\\?"/);
      if (match) {
        whereClause = `AND SpanName != {filterSpanName: String}`;
      }
    }

    const rows = await this.clickhousePool.executeQuery<{
      SpanName: string;
      ServiceName: string;
      TotalDurationMs: number;
      AvgDurationMs: number;
      CallCount: number;
    }>(
      `SELECT
         SpanName,
         ServiceName,
         round(sum(Duration) / 1000000, 2)          AS TotalDurationMs,
         round(avg(Duration) / 1000000, 2)          AS AvgDurationMs,
         count()                                     AS CallCount
       FROM otel.otel_traces
       WHERE 1=1 ${whereClause}
       GROUP BY SpanName, ServiceName
       ORDER BY TotalDurationMs DESC
       LIMIT 10`
    );

    // Compute percentage of total
    const grandTotal = rows.reduce((sum, r) => sum + r.TotalDurationMs, 0) || 1;

    return {
      sourceId: input.sourceId,
      parentFilter: input.parentFilter,
      totalTracesAnalyzed: rows.reduce((sum, r) => sum + r.CallCount, 0),
      operations: rows.map(r => ({
        operationName: r.SpanName,
        serviceName: r.ServiceName,
        totalDurationMs: r.TotalDurationMs,
        percentageOfTotalTime: parseFloat(((r.TotalDurationMs / grandTotal) * 100).toFixed(1)),
        averageDurationMs: r.AvgDurationMs,
        callCount: r.CallCount,
      })),
    };
  }
}
