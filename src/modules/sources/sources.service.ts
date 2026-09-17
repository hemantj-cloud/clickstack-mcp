import { Injectable } from '@nitrostack/core';
import { MOCK_SOURCES, MOCK_CONNECTIONS } from '../clickstack.data.js';
import { ClickHousePoolService } from '../../services/clickhouse-pool.service.js';

@Injectable({ deps: [ClickHousePoolService] })
export class SourcesService {
  private sources = [...MOCK_SOURCES];
  private connections = [...MOCK_CONNECTIONS];

  constructor(private readonly clickhousePool: ClickHousePoolService) {}

  async listSources() {
    return {
      sources: this.sources.map(s => ({
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
    const source = this.sources.find(s => s.id === sourceId);
    if (!source) {
      throw new Error(`Source '${sourceId}' not found. Call clickstack_list_sources to see available sources.`);
    }

    // Return detailed columns, map attribute keys, and sampled values
    const baseColumns = [
      { name: 'Timestamp', type: 'DateTime64(9)', jsType: 'string' },
      { name: 'ServiceName', type: 'LowCardinality(String)', jsType: 'string' },
    ];

    if (source.kind === 'trace') {
      return {
        sourceId,
        kind: 'trace',
        columns: [
          ...baseColumns,
          { name: 'TraceId', type: 'String', jsType: 'string' },
          { name: 'SpanId', type: 'String', jsType: 'string' },
          { name: 'ParentSpanId', type: 'String', jsType: 'string' },
          { name: 'SpanName', type: 'LowCardinality(String)', jsType: 'string' },
          { name: 'SpanKind', type: 'LowCardinality(String)', jsType: 'string' },
          { name: 'Duration', type: 'UInt64', jsType: 'number' },
          { name: 'StatusCode', type: 'LowCardinality(String)', jsType: 'string' },
          { name: 'SpanAttributes', type: 'Map(String, String)', jsType: 'object' },
          { name: 'ResourceAttributes', type: 'Map(String, String)', jsType: 'object' },
        ],
        mapAttributeKeys: [
          'http.method', 'http.route', 'http.status_code', 'db.system', 'db.statement', 'error.type', 'user.id'
        ],
        lowCardinalityValues: {
          ServiceName: ['checkout-service', 'auth-service', 'inventory-service', 'payment-service'],
          StatusCode: ['ok', 'error', 'unset'],
          SpanKind: ['Server', 'Client', 'Internal', 'Producer', 'Consumer'],
        },
        config: source,
      };
    }

    if (source.kind === 'log') {
      return {
        sourceId,
        kind: 'log',
        columns: [
          ...baseColumns,
          { name: 'Body', type: 'String', jsType: 'string' },
          { name: 'SeverityText', type: 'LowCardinality(String)', jsType: 'string' },
          { name: 'SeverityNumber', type: 'UInt8', jsType: 'number' },
          { name: 'LogAttributes', type: 'Map(String, String)', jsType: 'object' },
          { name: 'ResourceAttributes', type: 'Map(String, String)', jsType: 'object' },
        ],
        mapAttributeKeys: ['k8s.pod.name', 'k8s.namespace.name', 'cloud.region'],
        lowCardinalityValues: {
          SeverityText: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'],
        },
        config: source,
      };
    }

    return {
      sourceId,
      kind: source.kind,
      columns: baseColumns,
      config: source,
    };
  }

  async listMetrics(sourceId: string, kind?: string, namePattern?: string) {
    const source = this.sources.find(s => s.id === sourceId);
    if (!source || source.kind !== 'metric') {
      throw new Error(`Metric source '${sourceId}' not found.`);
    }

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
    return {
      sourceId,
      metricName,
      kind,
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
    const existingIndex = this.sources.findIndex(s => s.id === config.id);
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
    const idx = this.sources.findIndex(s => s.id === id);
    if (idx >= 0) {
      this.sources.splice(idx, 1);
      return { id, status: 'deleted' };
    }
    throw new Error(`Source '${id}' not found`);
  }
}
