import { Injectable, ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { SourcesService } from '../sources/sources.service.js';

@Injectable({ deps: [SourcesService] })
export class ResourcesService {
  constructor(private readonly sourcesService: SourcesService) {}

  @Resource({
    uri: 'clickstack://sources/catalog',
    name: 'ClickStack Telemetry Sources Catalog',
    description: 'Catalog of active telemetry data sources, tables, and connection definitions',
    mimeType: 'application/json',
  })
  async getSourcesCatalog(_uri: string, _context: ExecutionContext) {
    const data = await this.sourcesService.listSources();
    return {
      type: 'text' as const,
      data: JSON.stringify(data, null, 2),
    };
  }

  @Resource({
    uri: 'clickstack://metrics/catalog',
    name: 'ClickStack Metrics Catalog',
    description: 'Catalog of available OpenTelemetry metrics, kinds, and units',
    mimeType: 'application/json',
  })
  async getMetricsCatalog(_uri: string, _context: ExecutionContext) {
    const data = await this.sourcesService.listMetrics('src_metric_prod_01');
    return {
      type: 'text' as const,
      data: JSON.stringify(data, null, 2),
    };
  }

  @Resource({
    uri: 'clickstack://schema/cheatsheet',
    name: 'OpenTelemetry Schema Cheatsheet',
    description: 'Quick reference for OpenTelemetry ClickHouse table schemas, columns, and map keys',
    mimeType: 'text/markdown',
  })
  async getSchemaCheatsheet(_uri: string, _context: ExecutionContext) {
    const markdown = `# ClickStack OpenTelemetry Schema Cheatsheet

## 1. Traces & Spans Table (\`otel_traces\`)
- \`TraceId\` (String): 128-bit hex trace identifier.
- \`SpanId\` (String): 64-bit hex span identifier.
- \`ParentSpanId\` (String): Parent span ID. Root spans have \`ParentSpanId = ''\`.
- \`ServiceName\` (LowCardinality(String)): Originating service (e.g. \`checkout-service\`).
- \`SpanName\` (LowCardinality(String)): Operation name (e.g. \`POST /api/v1/checkout\`).
- \`Duration\` (UInt64): Elapsed span time in **nanoseconds**. (Divide by 1e6 for ms).
- \`StatusCode\` (LowCardinality(String)): \`'ok'\`, \`'error'\`, or \`'unset'\`.
- \`Timestamp\` (DateTime64(9)): Span start timestamp.
- \`SpanAttributes\` (Map(String, String)): Span key-value pairs (e.g. \`SpanAttributes['http.status_code']\`).
- \`ResourceAttributes\` (Map(String, String)): Entity attributes (e.g. \`ResourceAttributes['k8s.pod.name']\`).

## 2. Logs Table (\`otel_logs\`)
- \`Timestamp\` (DateTime64(9)): Log emission time.
- \`TraceId\` (String): Correlated trace ID (empty if un-traced).
- \`SpanId\` (String): Correlated span ID.
- \`SeverityText\` (LowCardinality(String)): \`'DEBUG'\`, \`'INFO'\`, \`'WARN'\`, \`'ERROR'\`, \`'FATAL'\`.
- \`Body\` (String): Log message text.
- \`LogAttributes\` (Map(String, String)): Structured log metadata.

## 3. Metrics Tables
- \`otel_metrics_gauge\`: Instantaneous values (\`MetricName\`, \`Value\`, \`Attributes\`).
- \`otel_metrics_sum\`: Monotonic counter totals (\`MetricName\`, \`Value\`, \`IsMonotonic\`).
- \`otel_metrics_histogram\`: Latency distributions and quantile states.
`;

    return {
      type: 'text' as const,
      data: markdown,
    };
  }
}
