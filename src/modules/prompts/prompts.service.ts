import { Injectable, PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

@Injectable()
export class PromptsService {
  @Prompt({
    name: 'clickstack_query_guide',
    description: 'Steering instructions for AI agents on ClickHouse OTel schema, Lucene vs SQL, and map syntax',
  })
  async queryGuide(_args: Record<string, any>, _context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `You are an expert Site Reliability Engineer (SRE) investigating telemetry in ClickHouse/ClickStack.
Follow these mandatory guidelines:

1. PREFER DOMAIN BUILDER TOOLS OVER RAW SQL:
   - For metrics trends over time: use 'clickstack_timeseries'
   - For single KPI numbers, aggregations, or breakdown tables: use 'clickstack_table'
   - For log searches and grep: use 'clickstack_search' (with denoise: true to suppress healthchecks)
   - For recurring log patterns: use 'clickstack_event_patterns' (Drain 3 clustering)
   - For root-cause divergence analysis: use 'clickstack_event_deltas'
   - For distributed traces and flamegraphs: use 'clickstack_trace_waterfall'
   - Use 'clickstack_sql' ONLY as a last resort when no builder tool fits.

2. SYNTAX & MAP ACCESS RULES:
   - Map columns (SpanAttributes, ResourceAttributes, LogAttributes) require bracket notation in SQL:
     SpanAttributes['http.status_code'] = '500' (NOT SpanAttributes.http.status_code)
   - In Lucene syntax (whereLanguage: 'lucene'), use field:value format:
     ServiceName:checkout-service AND http.status_code:500
   - Timestamps are in ISO 8601 UTC string format (e.g. 2026-09-18T00:00:00Z).
   - Trace Durations in ClickHouse are stored in nanoseconds. Divide by 1,000,000 for milliseconds.

3. OPENTELEMETRY METRIC TABLES:
   - Gauge metrics: otel_metrics_gauge (Value = instantaneous level)
   - Sum/Counter metrics: otel_metrics_sum (Value = monotonic count)
   - Histogram metrics: otel_metrics_histogram (AggregatingMergeTree with quantile states)
   - Use 'clickstack_describe_metric' to inspect percentiles (p50, p90, p95, p99) and cardinality.`,
      },
    ];
  }

  @Prompt({
    name: 'clickstack_create_dashboard',
    description: 'Playbook for designing operational dashboards using Golden Signals or the RED/USE methods',
    arguments: [
      {
        name: 'serviceName',
        description: 'Target microservice name (e.g. checkout-service)',
        required: false,
      },
      {
        name: 'dashboardType',
        description: 'Template archetype: api_reliability, host_resources, or db_health',
        required: false,
      },
    ],
  })
  async createDashboardPrompt(args: Record<string, any>, _context: ExecutionContext) {
    const service = args.serviceName ? ` for '${args.serviceName}'` : '';
    const archetype = args.dashboardType || 'api_reliability';

    return [
      {
        role: 'user' as const,
        content: `Design an enterprise SRE operational dashboard${service} using the '${archetype}' archetype.

DASHBOARD AUTHORING PLAYBOOK:
1. Standard Grid Layout:
   - Canvas width is 12 columns.
   - Row 0 (KPIs): Single numbers (displayType: 'number', w: 3 or 4, h: 2). Show Error Rate, P95 Latency, Total Requests.
   - Row 1 (Core Signals): Timeseries charts (displayType: 'line', w: 6, h: 4). Show Traffic Rate (req/s) and Latency Percentiles (p50/p90/p99).
   - Row 2 (Anomalies & Errors): Table or stacked bar (w: 12, h: 4). Top 10 error log templates from Drain or slow SQL statements.

2. Tile Definition Format:
   Each tile must specify:
   - id: unique string (e.g. tile_kpi_errors)
   - name: clear title
   - displayType: 'line' | 'stacked_bar' | 'number' | 'table' | 'pie'
   - x, y, w, h: grid coordinates
   - config: { sourceId, select, where, groupBy }

3. Batch Validation:
   After constructing the dashboard JSON, always call 'clickstack_query_tiles' with the dashboard ID to execute and validate all tile queries in parallel before presenting to the user.`,
      },
    ];
  }

  @Prompt({
    name: 'clickstack_dashboard_examples',
    description: 'Reference JSON templates for production SRE dashboards',
  })
  async dashboardExamples(_args: Record<string, any>, _context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: `Here is a production-ready Golden Signals API dashboard template:

{
  "name": "Production API Reliability & Golden Signals",
  "tags": ["production", "api", "sre"],
  "tiles": [
    {
      "id": "tile_kpi_5xx",
      "name": "5xx Error Rate",
      "displayType": "number",
      "x": 0, "y": 0, "w": 4, "h": 2,
      "config": { "sourceId": "src_trace_prod_01", "select": [{ "valueExpression": "countIf(StatusCode = 'error') / count() * 100", "alias": "ErrorRate" }] }
    },
    {
      "id": "tile_kpi_p95",
      "name": "P95 Latency",
      "displayType": "number",
      "x": 4, "y": 0, "w": 4, "h": 2,
      "config": { "sourceId": "src_trace_prod_01", "select": [{ "valueExpression": "quantile(0.95)(Duration) / 1000000", "alias": "P95LatencyMs" }] }
    },
    {
      "id": "tile_kpi_throughput",
      "name": "Total Throughput",
      "displayType": "number",
      "x": 8, "y": 0, "w": 4, "h": 2,
      "config": { "sourceId": "src_trace_prod_01", "select": [{ "valueExpression": "count()", "alias": "TotalRequests" }] }
    },
    {
      "id": "tile_ts_latency_by_route",
      "name": "P95 Latency by Endpoint Over Time",
      "displayType": "line",
      "x": 0, "y": 2, "w": 8, "h": 4,
      "config": { "sourceId": "src_trace_prod_01", "granularity": "5m", "groupBy": "SpanName" }
    },
    {
      "id": "tile_err_table",
      "name": "Top Failed Spans",
      "displayType": "table",
      "x": 8, "y": 2, "w": 4, "h": 4,
      "config": { "sourceId": "src_trace_prod_01", "where": "StatusCode = 'error'", "groupBy": "SpanName" }
    }
  ]
}`,
      },
    ];
  }
}
