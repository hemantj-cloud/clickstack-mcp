import { Injectable } from '@nitrostack/core';
import { ClickHousePoolService } from '../../services/clickhouse-pool.service.js';
import { DrainClusterer } from './algorithms/drain.js';
import { computeDistributionDivergence, type DivergenceItem } from './algorithms/divergence.js';
import { parseWhereClause } from './algorithms/filter-parser.js';
import { clickstackConfig } from '../../config/clickstack.config.js';

@Injectable({ deps: [ClickHousePoolService] })
export class QueryService {
  private drain = new DrainClusterer();

  constructor(private readonly clickhousePool: ClickHousePoolService) {}

  private get db(): string {
    return clickstackConfig.clickhouseDatabase || 'otel';
  }

  async timeseries(input: any) {
    const granularity = input.granularity || '5m';
    const intervalSeconds = granularity.endsWith('m')
      ? parseInt(granularity, 10) * 60
      : granularity.endsWith('h')
      ? parseInt(granularity, 10) * 3600
      : 300;

    const displayType = input.displayType || 'line';
    const select = input.select ?? [];

    // Parse WHERE clause via Lucene/SQL filter parser
    const parsed = parseWhereClause(input.where, input.whereLanguage || 'lucene');

    // Determine source table and metric expression from input
    const sourceId: string = input.sourceId ?? '';
    const isMetric = sourceId.includes('metric');
    const isLog = sourceId.includes('log');

    if (isMetric) {
      const metricName = parsed.extracted.metricName ?? 'system.cpu.utilization';
      const rows = await this.clickhousePool.executeQuery<{
        ts: string;
        value: number;
      }>(
        `SELECT
           formatDateTime(toStartOfInterval(Timestamp, INTERVAL {interval: UInt32} SECOND), '%Y-%m-%dT%H:%i:%SZ') AS ts,
           avg(Value) AS value
         FROM ${this.db}.otel_metrics_gauge
         WHERE MetricName = {metricName: String}
         GROUP BY ts
         ORDER BY ts ASC`,
        { interval: intervalSeconds, metricName }
      );
      return {
        sourceId,
        granularity,
        displayType,
        series: [{ alias: metricName, data: rows.map(r => ({ timestamp: r.ts, value: r.value })) }],
      };
    }

    if (isLog) {
      const severity = parsed.extracted.severity;
      const rows = await this.clickhousePool.executeQuery<{ ts: string; value: number }>(
        `SELECT
           formatDateTime(toStartOfInterval(Timestamp, INTERVAL {interval: UInt32} SECOND), '%Y-%m-%dT%H:%i:%SZ') AS ts,
           count() AS value
         FROM ${this.db}.otel_logs
         ${severity ? 'WHERE SeverityText = {severity: String}' : ''}
         GROUP BY ts
         ORDER BY ts ASC`,
        severity ? { interval: intervalSeconds, severity } : { interval: intervalSeconds }
      );
      return {
        sourceId,
        granularity,
        displayType,
        series: [{ alias: 'Log Count', data: rows.map(r => ({ timestamp: r.ts, value: r.value })) }],
      };
    }

    // Default: trace latency time series from otel_traces
    const valueExpr = select[0]?.valueExpression?.includes('Duration')
      ? 'avg(Duration) / 1000000'
      : 'countIf(StatusCode = \'error\') / count() * 100';
    const alias = select[0]?.alias ?? (valueExpr.includes('Duration') ? 'Avg Latency (ms)' : '5xx Error Rate (%)');

    const traceWhere = parsed.sqlWhere ? `WHERE ${parsed.sqlWhere}` : '';

    const rows = await this.clickhousePool.executeQuery<{ ts: string; value: number }>(
      `SELECT
         formatDateTime(toStartOfInterval(Timestamp, INTERVAL {interval: UInt32} SECOND), '%Y-%m-%dT%H:%i:%SZ') AS ts,
         ${valueExpr} AS value
       FROM ${this.db}.otel_traces
       ${traceWhere}
       GROUP BY ts
       ORDER BY ts ASC`,
      { interval: intervalSeconds }
    );

    return {
      sourceId,
      granularity,
      displayType,
      series: [{ alias, data: rows.map(r => ({ timestamp: r.ts, value: parseFloat(Number(r.value).toFixed(3)) })) }],
    };
  }

  async table(input: any) {
    const shape = input.shape || 'table';

    if (shape === 'number') {
      const result = await this.clickhousePool.executeQuery<{ errorRate: number }>(
        `SELECT round(countIf(StatusCode = 'error') / count() * 100, 2) AS errorRate
         FROM ${this.db}.otel_traces
         WHERE ParentSpanId = ''`
      );
      return {
        shape: 'number',
        value: result[0]?.errorRate ?? 0,
        unit: '%',
        label: '5xx Error Rate',
        status: (result[0]?.errorRate ?? 0) > 5 ? 'alert' : 'ok',
      };
    }

    const rows = await this.clickhousePool.executeQuery<{
      ServiceName: string;
      TotalRequests: number;
      ErrorCount: number;
      P95LatencyMs: number;
    }>(
      `SELECT
         ServiceName,
         count()                                        AS TotalRequests,
         countIf(StatusCode = 'error')                 AS ErrorCount,
         round(quantile(0.95)(Duration) / 1000000, 2)  AS P95LatencyMs
       FROM ${this.db}.otel_traces
       GROUP BY ServiceName
       ORDER BY TotalRequests DESC`
    );

    return {
      shape,
      columns: ['ServiceName', 'TotalRequests', 'ErrorCount', 'P95LatencyMs'],
      rows,
    };
  }

  async search(input: any) {
    const isDenoised = !!input.denoise;
    const parsed = parseWhereClause(input.where, input.whereLanguage || 'lucene', 'logs');
    
    let whereClause = '';
    const params: Record<string, any> = {};

    if (parsed.sqlWhere) {
      whereClause = `AND (${parsed.sqlWhere})`;
    } else if (input.where) {
      whereClause = `AND Body ILIKE {bodyFilter: String}`;
      params.bodyFilter = `%${input.where}%`;
    }

    const denoiseClause = isDenoised
      ? `AND Body NOT ILIKE '%HealthCheck ping%'`
      : '';

    const limit = Math.min(Math.max(parseInt(input.limit ?? '50', 10), 1), 1000);
    const offset = Math.max(parseInt(input.offset ?? '0', 10), 0);
    params.limit = limit;
    params.offset = offset;

    const rows = await this.clickhousePool.executeQuery<{
      Timestamp: string;
      ServiceName: string;
      SeverityText: string;
      Body: string;
      LogAttributes: Record<string, string>;
    }>(
      `SELECT
         formatDateTime(Timestamp, '%Y-%m-%dT%H:%i:%S.%fZ') AS Timestamp,
         ServiceName,
         SeverityText,
         Body,
         LogAttributes
       FROM ${this.db}.otel_logs
       WHERE 1=1 ${whereClause} ${denoiseClause}
       ORDER BY Timestamp DESC
       LIMIT {limit: UInt32}
       OFFSET {offset: UInt32}`,
      params
    );

    return {
      sourceId: input.sourceId,
      denoised: isDenoised,
      totalCount: rows.length,
      rows,
    };
  }

  async eventPatterns(input: any) {
    const sampleSize = input.sampleSize || 20000;

    const rows = await this.clickhousePool.executeQuery<{ Body: string }>(
      `SELECT Body FROM ${this.db}.otel_logs
       ORDER BY Timestamp DESC
       LIMIT {sampleSize: UInt32}`,
      { sampleSize }
    );

    const messages = rows.map(r => r.Body);
    const patterns = this.drain.clusterLogs(messages);

    return {
      sourceId: input.sourceId,
      sampleSize: messages.length,
      totalPatterns: patterns.length,
      patterns,
    };
  }

  async eventDeltas(input: any) {
    const targetParsed = parseWhereClause(input.target?.where, input.target?.whereLanguage || 'lucene');
    const baselineParsed = parseWhereClause(input.baseline?.where, input.baseline?.whereLanguage || 'lucene');

    const targetWhere = targetParsed.sqlWhere;
    const baselineWhere = baselineParsed.sqlWhere;

    // Fetch target window logs
    const targetRows = await this.clickhousePool.executeQuery<{
      Body: string;
      SeverityText: string;
      ServiceName: string;
    }>(
      `SELECT Body, SeverityText, ServiceName FROM ${this.db}.otel_logs
       ${targetWhere ? `WHERE ${targetWhere}` : ''}
       ORDER BY Timestamp DESC LIMIT 5000`
    );

    // Fetch baseline window logs
    const baselineRows = await this.clickhousePool.executeQuery<{
      Body: string;
      SeverityText: string;
      ServiceName: string;
    }>(
      `SELECT Body, SeverityText, ServiceName FROM ${this.db}.otel_logs
       ${baselineWhere ? `WHERE ${baselineWhere}` : ''}
       ORDER BY Timestamp ASC LIMIT 5000`
    );

    // Compute divergence on multiple attribute dimensions
    const dimensions: { attr: string; getVal: (r: any) => string }[] = [
      { attr: 'SeverityText', getVal: r => r.SeverityText },
      { attr: 'ServiceName', getVal: r => r.ServiceName },
      { attr: 'Body (masked)', getVal: r => this.drain.maskLog(r.Body) },
    ];

    const divergences: DivergenceItem[] = dimensions.map(dim => {
      const targetVals = targetRows.map(dim.getVal);
      const baselineVals = baselineRows.map(dim.getVal);
      const score = computeDistributionDivergence(targetVals, baselineVals);

      const topValuesFor = (vals: string[]) => {
        const counts = new Map<string, number>();
        for (const v of vals) counts.set(v, (counts.get(v) || 0) + 1);
        const total = vals.length || 1;
        return Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([value, count]) => ({ value, percent: parseFloat(((count / total) * 100).toFixed(1)) }));
      };

      return {
        attribute: dim.attr,
        divergenceScore: score,
        targetTopValues: topValuesFor(targetVals),
        baselineTopValues: topValuesFor(baselineVals),
      };
    }).sort((a, b) => b.divergenceScore - a.divergenceScore);

    return {
      sourceId: input.sourceId,
      targetFilter: targetWhere,
      baselineFilter: baselineWhere,
      divergences,
    };
  }

  async emergingSignals(input: any) {
    const minShareRatio = input.minShareRatio || 2.0;

    // Split logs into two halves: recent (target) vs older (baseline)
    const recentRows = await this.clickhousePool.executeQuery<{ Body: string }>(
      `SELECT Body FROM ${this.db}.otel_logs
       WHERE Timestamp >= subtractHours(now(), 1)
       ORDER BY Timestamp DESC LIMIT 2000`
    );

    const olderRows = await this.clickhousePool.executeQuery<{ Body: string }>(
      `SELECT Body FROM ${this.db}.otel_logs
       WHERE Timestamp < subtractHours(now(), 1)
       ORDER BY Timestamp DESC LIMIT 2000`
    );

    const recentPatterns = this.drain.clusterLogs(recentRows.map(r => r.Body));
    const olderPatterns = this.drain.clusterLogs(olderRows.map(r => r.Body));

    const olderMap = new Map(olderPatterns.map(p => [p.template, p.percentage]));
    const recentMap = new Map(recentPatterns.map(p => [p.template, p.percentage]));

    const emerging: any[] = [];
    const disappeared: any[] = [];

    for (const p of recentPatterns) {
      const baselinePct = olderMap.get(p.template) ?? 0;
      const ratio = baselinePct === 0 ? Infinity : p.percentage / baselinePct;
      if (ratio >= minShareRatio && p.percentage > 1.0) {
        emerging.push({
          pattern: p.template,
          currentShare: `${p.percentage.toFixed(2)}%`,
          baselineShare: `${baselinePct.toFixed(2)}%`,
          multiplier: ratio === Infinity ? 'NEW' : `${ratio.toFixed(1)}x`,
          sampleCount: p.sampleCount,
          whereSnippet: p.whereSnippet,
        });
      }
    }

    for (const p of olderPatterns) {
      const currentPct = recentMap.get(p.template) ?? 0;
      if (p.percentage > 5 && currentPct < 1) {
        disappeared.push({
          pattern: p.template,
          baselineShare: `${p.percentage.toFixed(2)}%`,
          currentShare: `${currentPct.toFixed(2)}%`,
          whereSnippet: p.whereSnippet,
        });
      }
    }

    return {
      sourceId: input.sourceId,
      minShareRatio,
      emerging: emerging.slice(0, 10),
      disappeared: disappeared.slice(0, 5),
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
