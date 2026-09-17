import { Injectable } from '@nitrostack/core';
import { MOCK_SOURCES, MOCK_CONNECTIONS } from '../clickstack.data.js';
import { ClickHousePoolService } from '../../services/clickhouse-pool.service.js';
import { clickstackConfig } from '../../config/clickstack.config.js';

@Injectable({ deps: [ClickHousePoolService] })
export class SourcesService {
  private static _sources = [...MOCK_SOURCES];
  private static _connections = [
    { id: 'conn_clickhouse_local', name: 'Local ClickHouse Docker (:8123)' },
    ...MOCK_CONNECTIONS,
  ];

  private get sources() {
    return SourcesService._sources;
  }

  private set sources(val: any[]) {
    SourcesService._sources = val;
  }

  private get connections() {
    return SourcesService._connections;
  }

  private set connections(val: any[]) {
    SourcesService._connections = val;
  }

  constructor(private readonly clickhousePool: ClickHousePoolService) {}

  private get db(): string {
    return clickstackConfig.clickhouseDatabase || 'otel';
  }

  async listSources() {
    try {
      const tables = await this.clickhousePool.executeQuery<{ name: string; engine: string }>(
        `SELECT name, engine FROM system.tables WHERE database = '${this.db}'`
      );

      if (tables.length > 0) {
        const liveSources = tables.map((t) => {
          const kind = t.name.includes('trace')
            ? 'trace'
            : t.name.includes('log')
            ? 'log'
            : 'metric';

          return {
            id: `src_${t.name}`,
            name: `ClickHouse ${t.name.replace(/_/g, ' ')} (${t.engine})`,
            kind,
            connection: 'conn_clickhouse_local',
            databaseName: this.db,
            tableName: t.name,
            ...(kind === 'metric'
              ? {
                  metricNamesPreview: {
                    gauge: ['system.cpu.utilization', 'system.memory.usage', 'k8s.pod.cpu.utilization', 'process.threads'],
                  },
                }
              : {}),
          };
        });

        return {
          sources: liveSources,
          connections: this.connections,
        };
      }
    } catch {
      // Graceful fallback to seed dataset if DB is unreachable
    }

    return {
      sources: this.sources.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
        connection: s.connection,
        ...(s.kind === 'metric' ? { metricNamesPreview: (s as any).metricNamesPreview } : {}),
      })),
      connections: this.connections,
    };
  }

  async describeSource(sourceId: string) {
    try {
      const tableName = sourceId.startsWith('src_')
        ? sourceId.substring(4)
        : sourceId === 'src_trace_prod_01'
        ? 'otel_traces'
        : sourceId === 'src_log_prod_01'
        ? 'otel_logs'
        : 'otel_metrics_gauge';

      const cols = await this.clickhousePool.executeQuery<{ name: string; type: string }>(
        `SELECT name, type FROM system.columns WHERE database = 'otel' AND table = '${tableName}'`
      );

      if (cols.length > 0) {
        return {
          sourceId,
          database: 'otel',
          table: tableName,
          columns: cols.map((c) => ({
            name: c.name,
            type: c.type,
            jsType: c.type.includes('Int') || c.type.includes('Float') ? 'number' : 'string',
          })),
          mapAttributeKeys: [
            'http.method',
            'http.route',
            'http.status_code',
            'cloud.region',
            'host.name',
            'db.system',
            'db.statement',
            'error.type',
          ],
          lowCardinalityValues: {
            ServiceName: ['checkout-service', 'auth-service', 'inventory-service', 'payment-service'],
            StatusCode: ['ok', 'error', 'unset'],
            SpanKind: ['Server', 'Client', 'Internal'],
          },
          config: {
            id: sourceId,
            connection: 'conn_clickhouse_local',
            databaseName: 'otel',
            tableName,
          },
        };
      }
    } catch {
      // Fallback
    }

    const source = this.sources.find((s) => s.id === sourceId);
    if (!source) {
      throw new Error(`Source '${sourceId}' not found. Call clickstack_list_sources to see available sources.`);
    }

    const baseColumns = [
      { name: 'Timestamp', type: 'DateTime64(9)', jsType: 'string' },
      { name: 'ServiceName', type: 'LowCardinality(String)', jsType: 'string' },
    ];

    return {
      sourceId,
      kind: source.kind,
      columns: baseColumns,
      config: source,
    };
  }

  async listMetrics(sourceId: string, kind?: string, namePattern?: string) {
    try {
      const rows = await this.clickhousePool.executeQuery<{
        MetricName: string;
        Description: string;
        Unit: string;
      }>(
        `SELECT DISTINCT MetricName, any(Description) AS Description, any(Unit) AS Unit FROM ${this.db}.otel_metrics_gauge GROUP BY MetricName`
      );

      if (rows.length > 0) {
        return {
          metrics: rows.map((r) => ({
            name: r.MetricName,
            kind: 'gauge',
            unit: r.Unit || '1',
            description: r.Description || `OpenTelemetry gauge ${r.MetricName}`,
          })),
          nextCursor: null,
        };
      }
    } catch {
      // Fallback
    }

    const source = this.sources.find((s) => s.id === sourceId) || this.sources[2];
    const preview = (source as any).metricNamesPreview || {};
    const allMetrics: any[] = [];
    for (const [k, names] of Object.entries(preview)) {
      if (!kind || kind === k) {
        for (const name of names as string[]) {
          if (!namePattern || name.toLowerCase().includes(namePattern.toLowerCase())) {
            allMetrics.push({ name, kind: k, unit: '1', description: `OTel ${k} metric ${name}` });
          }
        }
      }
    }

    return {
      metrics: allMetrics,
      nextCursor: null,
    };
  }

  async describeMetric(sourceId: string, metricName: string, kind: string) {
    try {
      const stats = await this.clickhousePool.executeQuery<{
        sampleCount: number;
        minVal: number;
        maxVal: number;
        avgVal: number;
        p95: number;
        unit: string;
        description: string;
        services: string[];
      }>(
        `SELECT
           count()                                        AS sampleCount,
           round(min(Value), 3)                          AS minVal,
           round(max(Value), 3)                          AS maxVal,
           round(avg(Value), 3)                          AS avgVal,
           round(quantile(0.95)(Value), 3)               AS p95,
           any(Unit)                                      AS unit,
           any(Description)                               AS description,
           groupUniqArray(ServiceName)                    AS services
         FROM ${this.db}.otel_metrics_gauge
         WHERE MetricName = {metricName: String}`,
        { metricName }
      );

      if (stats.length > 0 && stats[0].sampleCount > 0) {
        const s = stats[0];
        return {
          sourceId,
          metricName,
          kind: kind || 'gauge',
          unit: s.unit || (metricName.includes('duration') ? 'ms' : '1'),
          description: s.description || `OpenTelemetry metric ${metricName}`,
          sampleCount: s.sampleCount,
          statistics: {
            min: s.minVal,
            max: s.maxVal,
            avg: s.avgVal,
            p95: s.p95,
          },
          servicesReporting: s.services,
          attributeKeys: ['host.name', 'env', 'service.name'],
          sampledValues: {
            'service.name': s.services,
            'env': ['production'],
          },
        };
      }
    } catch {
      // Graceful fallback if metric not yet reported
    }

    return {
      sourceId,
      metricName,
      kind: kind || 'gauge',
      unit: metricName.includes('duration') ? 'ms' : '1',
      description: `Metric drill-down for ${metricName}`,
      attributeKeys: ['service.name', 'host.name', 'http.method', 'http.status_code'],
      sampledValues: {
        'service.name': ['checkout-service', 'auth-service'],
        'http.method': ['GET', 'POST', 'PUT'],
      },
    };
  }

  async saveSource(config: any) {
    const existingIndex = this.sources.findIndex((s) => s.id === config.id);
    if (existingIndex >= 0) {
      this.sources[existingIndex] = { ...this.sources[existingIndex], ...config };
      return { id: config.id, status: 'updated' };
    } else {
      const newId = config.id || `src_${Date.now()}`;
      const newSource = { ...config, id: newId };
      this.sources.push(newSource);
      return { id: newId, status: 'created' };
    }
  }

  async deleteSource(id: string) {
    const idx = this.sources.findIndex((s) => s.id === id);
    if (idx >= 0) {
      this.sources.splice(idx, 1);
      return { id, status: 'deleted' };
    }
    throw new Error(`Source '${id}' not found`);
  }
}
