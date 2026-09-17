/**
 * Realistic seed & mock data for ClickStack Observability
 * Used for development, tests, and when upstream ClickHouse is in demo mode.
 */

export const MOCK_SOURCES = [
  {
    id: 'src_trace_prod_01',
    name: 'Production Traces (OTel)',
    kind: 'trace',
    connection: 'conn_clickhouse_primary',
    databaseName: 'otel',
    tableName: 'otel_traces',
    timestampValueExpression: 'Timestamp',
    durationExpression: 'Duration',
    traceIdExpression: 'TraceId',
    spanIdExpression: 'SpanId',
    parentSpanIdExpression: 'ParentSpanId',
    spanNameExpression: 'SpanName',
    spanKindExpression: 'SpanKind',
  },
  {
    id: 'src_log_prod_01',
    name: 'Production Logs (OTel & System)',
    kind: 'log',
    connection: 'conn_clickhouse_primary',
    databaseName: 'otel',
    tableName: 'otel_logs',
    timestampValueExpression: 'Timestamp',
    defaultTableSelectExpression: 'Body',
  },
  {
    id: 'src_metric_prod_01',
    name: 'Infrastructure & Host Metrics',
    kind: 'metric',
    connection: 'conn_clickhouse_primary',
    databaseName: 'otel',
    tableName: 'otel_metrics_gauge',
    timestampValueExpression: 'Timestamp',
    metricTables: {
      gauge: 'otel_metrics_gauge',
      sum: 'otel_metrics_sum',
      histogram: 'otel_metrics_histogram',
      exponentialHistogram: 'otel_metrics_exp_histogram',
      summary: 'otel_metrics_summary',
    },
    metricNamesPreview: {
      gauge: ['system.cpu.utilization', 'system.memory.usage', 'k8s.pod.cpu.utilization', 'process.threads'],
      sum: ['http.server.request.count', 'db.client.connections.use', 'jvm.gc.memory.allocated'],
      histogram: ['http.server.request.duration', 'db.client.operation.duration'],
    },
  },
];

export const MOCK_CONNECTIONS = [
  { id: 'conn_clickhouse_primary', name: 'Primary ClickHouse Production Cluster' },
  { id: 'conn_clickhouse_analytics', name: 'Analytical Read Replica' },
];

export const MOCK_TRACE_WATERFALL = {
  traceId: '7b3f9104e1a89c2fa394bc21890e44b1',
  rootService: 'checkout-service',
  durationMs: 2412.35,
  spanCount: 6,
  sourceId: 'src_trace_prod_01',
  spans: [
    {
      spanId: 'span_01',
      parentSpanId: null,
      serviceName: 'checkout-service',
      spanName: 'POST /api/v1/orders/checkout',
      spanKind: 'Server',
      statusCode: 'error',
      startOffsetMs: 0,
      durationMs: 2412.35,
      durationNs: 2412350000,
      attributes: {
        'http.method': 'POST',
        'http.route': '/api/v1/orders/checkout',
        'http.status_code': '500',
        'user.id': 'usr_94821',
      },
      logs: [
        { timestamp: '2026-09-17T18:22:00.100Z', level: 'INFO', message: 'Order checkout initiated for cart #84210' },
        { timestamp: '2026-09-17T18:22:02.400Z', level: 'ERROR', message: 'Order processing failed due to downstream database lock timeout' },
      ],
    },
    {
      spanId: 'span_02',
      parentSpanId: 'span_01',
      serviceName: 'auth-service',
      spanName: 'POST /v1/tokens/verify',
      spanKind: 'Client',
      statusCode: 'ok',
      startOffsetMs: 12.4,
      durationMs: 45.2,
      durationNs: 45200000,
      attributes: { 'http.status_code': '200', 'auth.type': 'Bearer' },
      logs: [],
    },
    {
      spanId: 'span_03',
      parentSpanId: 'span_01',
      serviceName: 'inventory-service',
      spanName: 'POST /v2/inventory/lock',
      spanKind: 'Client',
      statusCode: 'error',
      startOffsetMs: 65.1,
      durationMs: 2210.8,
      durationNs: 2210800000,
      isCriticalPath: true,
      attributes: {
        'http.status_code': '504',
        'db.system': 'postgresql',
        'db.statement': 'SELECT * FROM inventory WHERE product_id = 9842 FOR UPDATE',
        'error.type': 'LockTimeoutException',
      },
      logs: [
        { timestamp: '2026-09-17T18:22:00.200Z', level: 'INFO', message: 'Acquiring lock on row #9842' },
        { timestamp: '2026-09-17T18:22:02.350Z', level: 'WARN', message: 'Transaction wait timeout exceeded (>2000ms)' },
      ],
    },
    {
      spanId: 'span_04',
      parentSpanId: 'span_03',
      serviceName: 'postgres-db',
      spanName: 'query: SELECT * FROM inventory FOR UPDATE',
      spanKind: 'Internal',
      statusCode: 'error',
      startOffsetMs: 70.0,
      durationMs: 2200.0,
      durationNs: 2200000000,
      isCriticalPath: true,
      attributes: {
        'db.operation': 'SELECT',
        'db.table': 'inventory',
        'db.row_count': 1,
      },
      logs: [],
    },
    {
      spanId: 'span_05',
      parentSpanId: 'span_01',
      serviceName: 'payment-service',
      spanName: 'POST /v1/charges',
      spanKind: 'Client',
      statusCode: 'ok',
      startOffsetMs: 2280.0,
      durationMs: 120.0,
      durationNs: 120000000,
      attributes: { 'payment.provider': 'stripe', 'http.status_code': '200' },
      logs: [],
    },
    {
      spanId: 'span_06',
      parentSpanId: 'span_05',
      serviceName: 'stripe-api',
      spanName: 'HTTPS POST api.stripe.com',
      spanKind: 'Client',
      statusCode: 'ok',
      startOffsetMs: 2290.0,
      durationMs: 105.0,
      durationNs: 105000000,
      attributes: { 'http.host': 'api.stripe.com' },
      logs: [],
    },
  ],
};

export const MOCK_TIMESERIES = {
  series: [
    {
      alias: 'P95 Latency (ms)',
      data: [
        { timestamp: '2026-09-17T18:00:00Z', value: 142.1 },
        { timestamp: '2026-09-17T18:05:00Z', value: 155.4 },
        { timestamp: '2026-09-17T18:10:00Z', value: 160.2 },
        { timestamp: '2026-09-17T18:15:00Z', value: 680.5 },
        { timestamp: '2026-09-17T18:20:00Z', value: 2410.8 },
        { timestamp: '2026-09-17T18:25:00Z', value: 2190.4 },
        { timestamp: '2026-09-17T18:30:00Z', value: 410.2 },
      ],
    },
    {
      alias: '5xx Error Rate (%)',
      data: [
        { timestamp: '2026-09-17T18:00:00Z', value: 0.05 },
        { timestamp: '2026-09-17T18:05:00Z', value: 0.08 },
        { timestamp: '2026-09-17T18:10:00Z', value: 0.12 },
        { timestamp: '2026-09-17T18:15:00Z', value: 4.80 },
        { timestamp: '2026-09-17T18:20:00Z', value: 18.50 },
        { timestamp: '2026-09-17T18:25:00Z', value: 14.20 },
        { timestamp: '2026-09-17T18:30:00Z', value: 1.10 },
      ],
    },
  ],
};

export const MOCK_EVENT_DELTAS = {
  divergences: [
    {
      attribute: "SpanAttributes['db.statement']",
      divergenceScore: 0.984,
      targetTopValues: [{ value: 'SELECT * FROM inventory FOR UPDATE', percent: 89.2 }],
      baselineTopValues: [{ value: 'SELECT * FROM inventory FOR UPDATE', percent: 2.1 }],
    },
    {
      attribute: "ResourceAttributes['k8s.pod.name']",
      divergenceScore: 0.521,
      targetTopValues: [{ value: 'checkout-service-78bf-x942', percent: 68.4 }],
      baselineTopValues: [{ value: 'checkout-service-78bf-x942', percent: 12.0 }],
    },
    {
      attribute: "SpanAttributes['http.status_code']",
      divergenceScore: 0.442,
      targetTopValues: [{ value: '504', percent: 42.0 }, { value: '500', percent: 38.0 }],
      baselineTopValues: [{ value: '200', percent: 99.4 }],
    },
    {
      attribute: "ResourceAttributes['cloud.region']",
      divergenceScore: 0.041,
      targetTopValues: [{ value: 'us-east-1', percent: 51.0 }],
      baselineTopValues: [{ value: 'us-east-1', percent: 49.8 }],
    },
  ],
};

export const MOCK_LOG_PATTERNS = [
  {
    template: 'HealthCheck ping received from IP <*>, status: 200 OK',
    sampleCount: 14640,
    percentage: 73.2,
    whereSnippet: 'Body:"HealthCheck ping received"',
    isSpam: true,
  },
  {
    template: 'HTTP <method> <path> completed in <ms>ms, status: 200',
    sampleCount: 3620,
    percentage: 18.1,
    whereSnippet: 'Body:"HTTP" AND Body:"completed in"',
  },
  {
    template: 'DB connection lock timeout waiting for row in table <*>',
    sampleCount: 840,
    percentage: 4.2,
    whereSnippet: 'Body:"lock timeout waiting for row"',
    isAnomaly: true,
  },
  {
    template: 'JWT token verification failed for user <*>',
    sampleCount: 42,
    percentage: 0.21,
    whereSnippet: 'Body:"JWT token verification failed"',
  },
];

export const MOCK_DASHBOARDS = [
  {
    id: 'dash_api_overview',
    name: 'Production API & Reliability Overview',
    tags: ['production', 'api', 'golden-signals'],
    tiles: [
      {
        id: 'tile_kpi_error',
        name: '5xx Error Rate',
        displayType: 'number',
        x: 0, y: 0, w: 4, h: 3,
        config: { sourceId: 'src_trace_prod_01', value: '0.14%' },
      },
      {
        id: 'tile_p95_latency',
        name: 'P95 Latency by Route',
        displayType: 'line',
        x: 4, y: 0, w: 8, h: 3,
        config: { sourceId: 'src_trace_prod_01', groupBy: 'SpanName' },
      },
      {
        id: 'tile_top_errors',
        name: 'Top Recurring Error Patterns',
        displayType: 'table',
        x: 0, y: 3, w: 12, h: 4,
        config: { sourceId: 'src_log_prod_01', where: 'level:error' },
      },
    ],
  },
];

export const MOCK_ALERTS = [
  {
    id: 'alert_p99_spike',
    name: 'Checkout P99 Latency Surge',
    displayName: 'P99 Latency > 2000ms for 5m',
    state: 'ALERT',
    interval: '5m',
    threshold: 2000,
    thresholdType: 'above',
    channels: ['wh_slack_sre'],
  },
  {
    id: 'alert_5xx_rate',
    name: 'API 5xx Surge Rate',
    displayName: '5xx Error Rate > 5%',
    state: 'OK',
    interval: '1m',
    threshold: 5,
    thresholdType: 'above',
    channels: ['wh_slack_sre', 'wh_incidentio'],
  },
];

export const MOCK_WEBHOOKS = [
  { id: 'wh_slack_sre', name: '#sre-incidents', service: 'slack' },
  { id: 'wh_incidentio', name: 'Incident.io P1 Escalation', service: 'incidentio' },
  { id: 'wh_generic_pager', name: 'PagerDuty Webhook', service: 'generic' },
];
