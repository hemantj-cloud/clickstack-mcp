import { createClient } from '@clickhouse/client';

const client = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'otel',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max));
}

function hexId(len) {
  let hex = '';
  while (hex.length < len) {
    hex += Math.random().toString(16).substring(2);
  }
  return hex.substring(0, len);
}

async function seedTraces() {
  console.log('Generating rich traces...');
  const rows = [];
  const now = Date.now();

  // Create 20 distinct traces spanning the last 2 hours
  for (let t = 0; t < 20; t++) {
    const traceId = hexId(32);
    const traceOffsetMs = (20 - t) * 6 * 60 * 1000; // spread over 2 hours
    const traceStart = new Date(now - traceOffsetMs);
    const isErrorTrace = t % 4 === 0; // 25% error rate
    
    // Root span (API Gateway or Frontend)
    const rootSpanId = `span_${t}_root`;
    const rootDurationMs = isErrorTrace ? randomBetween(1800, 3200) : randomBetween(80, 450);
    const rootDurationNs = Math.floor(rootDurationMs * 1_000_000);
    
    const endpoints = [
      { route: '/api/v1/orders/checkout', method: 'POST' },
      { route: '/api/v1/products/list', method: 'GET' },
      { route: '/api/v1/cart/items', method: 'POST' },
      { route: '/api/v1/auth/verify', method: 'POST' },
      { route: '/api/v1/inventory/query', method: 'GET' },
    ];
    const ep = endpoints[t % endpoints.length];

    rows.push({
      Timestamp: traceStart.toISOString().replace('T', ' ').replace('Z', ''),
      TraceId: traceId,
      SpanId: rootSpanId,
      ParentSpanId: '',
      TraceState: '',
      SpanName: `${ep.method} ${ep.route}`,
      SpanKind: 'Server',
      ServiceName: 'api-gateway',
      ResourceAttributes: { 'cloud.region': 'us-east-1', 'k8s.pod.name': 'gateway-pod-1' },
      ScopeName: 'gateway-tracer',
      ScopeVersion: '1.4.0',
      SpanAttributes: {
        'http.method': ep.method,
        'http.route': ep.route,
        'http.status_code': isErrorTrace ? '500' : '200',
        'user.id': `usr_${randomInt(1000, 9999)}`,
      },
      Duration: rootDurationNs,
      StatusCode: isErrorTrace ? 'error' : 'ok',
      StatusMessage: isErrorTrace ? 'Downstream execution failed' : '',
    });

    // Child span 1: Auth check
    const authStart = new Date(traceStart.getTime() + 5);
    const authDurationNs = Math.floor(randomBetween(15, 60) * 1_000_000);
    const authSpanId = `span_${t}_auth`;
    rows.push({
      Timestamp: authStart.toISOString().replace('T', ' ').replace('Z', ''),
      TraceId: traceId,
      SpanId: authSpanId,
      ParentSpanId: rootSpanId,
      TraceState: '',
      SpanName: 'POST /v1/tokens/verify',
      SpanKind: 'Client',
      ServiceName: 'auth-service',
      ResourceAttributes: { 'cloud.region': 'us-east-1' },
      ScopeName: 'auth-tracer',
      ScopeVersion: '1.2.0',
      SpanAttributes: { 'http.method': 'POST', 'http.status_code': '200', 'auth.type': 'Bearer' },
      Duration: authDurationNs,
      StatusCode: 'ok',
      StatusMessage: '',
    });

    // Child span 2: Service business logic (checkout or inventory)
    const svcName = ep.route.includes('checkout') ? 'checkout-service' : 'inventory-service';
    const svcStart = new Date(traceStart.getTime() + 40);
    const svcDurationNs = Math.floor((rootDurationMs - 60) * 1_000_000);
    const svcSpanId = `span_${t}_svc`;
    rows.push({
      Timestamp: svcStart.toISOString().replace('T', ' ').replace('Z', ''),
      TraceId: traceId,
      SpanId: svcSpanId,
      ParentSpanId: rootSpanId,
      TraceState: '',
      SpanName: `internal_handle_${ep.route.split('/').pop()}`,
      SpanKind: 'Internal',
      ServiceName: svcName,
      ResourceAttributes: { 'cloud.region': 'us-east-1', 'host.name': 'k8s-worker-02' },
      ScopeName: `${svcName}-tracer`,
      ScopeVersion: '2.1.0',
      SpanAttributes: {
        'http.status_code': isErrorTrace ? '500' : '200',
        'db.system': 'postgresql',
      },
      Duration: svcDurationNs,
      StatusCode: isErrorTrace ? 'error' : 'ok',
      StatusMessage: isErrorTrace ? 'LockTimeoutException in PostgreSQL query' : '',
    });

    // Child span 3: DB query
    const dbStart = new Date(svcStart.getTime() + 10);
    const dbDurationNs = isErrorTrace ? Math.floor(randomBetween(1500, 2500) * 1_000_000) : Math.floor(randomBetween(10, 45) * 1_000_000);
    rows.push({
      Timestamp: dbStart.toISOString().replace('T', ' ').replace('Z', ''),
      TraceId: traceId,
      SpanId: `span_${t}_db`,
      ParentSpanId: svcSpanId,
      TraceState: '',
      SpanName: 'postgres.query: select_record',
      SpanKind: 'Internal',
      ServiceName: 'postgres-db',
      ResourceAttributes: { 'cloud.region': 'us-east-1' },
      ScopeName: 'db-tracer',
      ScopeVersion: '1.0.0',
      SpanAttributes: {
        'db.system': 'postgresql',
        'db.table': ep.route.includes('checkout') ? 'orders' : 'inventory',
        'db.statement': 'SELECT * FROM inventory WHERE product_id = 9842 FOR UPDATE',
      },
      Duration: dbDurationNs,
      StatusCode: isErrorTrace ? 'error' : 'ok',
      StatusMessage: isErrorTrace ? 'Query wait timeout' : '',
    });
  }

  await client.insert({
    table: 'otel_traces',
    values: rows,
    format: 'JSONEachRow',
  });
  console.log(`✓ Inserted ${rows.length} trace spans across 20 traces.`);
}

async function seedLogs() {
  console.log('Generating rich logs...');
  const rows = [];
  const now = Date.now();

  const logTemplates = [
    { service: 'ingress-nginx', severity: 'INFO', template: (i) => `HealthCheck ping received from IP 10.0.4.${10 + (i % 8)}, status: 200 OK`, count: 180 },
    { service: 'checkout-service', severity: 'INFO', template: (i) => `Order checkout initiated for cart #${80000 + i}`, count: 45 },
    { service: 'auth-service', severity: 'INFO', template: (i) => `Token verified successfully for user usr_${1000 + i}`, count: 35 },
    { service: 'inventory-service', severity: 'INFO', template: (i) => `Acquiring lock on row #${9000 + (i % 20)} in inventory table`, count: 40 },
    { service: 'auth-service', severity: 'WARN', template: (i) => `JWT token verification failed for user usr_invalid_${i}`, count: 15 },
    { service: 'inventory-service', severity: 'WARN', template: (i) => `Transaction wait timeout exceeded (>2000ms) on row lock product_id ${9000 + (i % 20)}`, count: 20 },
    { service: 'checkout-service', severity: 'ERROR', template: (i) => `Order processing failed due to downstream database lock timeout in inventory table`, count: 18 },
    { service: 'payment-service', severity: 'ERROR', template: (i) => `Payment processing gateway rejection from Stripe API: card_error`, count: 12 },
    { service: 'redis-cache', severity: 'WARN', template: (i) => `Cache memory pressure high: 88.5% used, evicting oldest keys`, count: 10 },
  ];

  for (const item of logTemplates) {
    for (let i = 0; i < item.count; i++) {
      const offsetMs = Math.floor(Math.random() * 3 * 3600 * 1000);
      const ts = new Date(now - offsetMs);
      const body = item.template(i);

      rows.push({
        Timestamp: ts.toISOString().replace('T', ' ').replace('Z', ''),
        TraceId: item.severity === 'ERROR' ? hexId(32) : '',
        SpanId: item.severity === 'ERROR' ? hexId(16) : '',
        TraceFlags: item.severity === 'ERROR' ? 1 : 0,
        SeverityText: item.severity,
        SeverityNumber: item.severity === 'ERROR' ? 17 : item.severity === 'WARN' ? 13 : 9,
        ServiceName: item.service,
        Body: body,
        ResourceAttributes: { 'cloud.region': 'us-east-1', 'host.name': 'k8s-node-01' },
        LogAttributes: { 'http.status_code': item.severity === 'ERROR' ? '500' : '200' },
      });
    }
  }

  await client.insert({
    table: 'otel_logs',
    values: rows,
    format: 'JSONEachRow',
  });
  console.log(`✓ Inserted ${rows.length} log records.`);
}

async function seedMetrics() {
  console.log('Generating rich timeseries metrics...');
  const rows = [];
  const now = Date.now();

  const metricDefs = [
    { name: 'system.cpu.utilization', unit: '1', desc: 'Host CPU utilization ratio', base: 0.45, var: 0.35, service: 'checkout-service' },
    { name: 'system.memory.usage', unit: 'By', desc: 'Host RAM usage bytes', base: 8e9, var: 4e9, service: 'checkout-service' },
    { name: 'k8s.pod.cpu.utilization', unit: '1', desc: 'K8s pod CPU ratio', base: 0.35, var: 0.45, service: 'inventory-service' },
    { name: 'http.server.duration', unit: 'ms', desc: 'HTTP request handling latency', base: 120, var: 250, service: 'api-gateway' },
    { name: 'process.threads', unit: '1', desc: 'Active thread count', base: 64, var: 80, service: 'checkout-service' },
    { name: 'jvm.memory.used', unit: 'By', desc: 'JVM Heap memory used', base: 1.5e9, var: 1e9, service: 'auth-service' },
  ];

  const steps = 288;
  const intervalMs = 5 * 60 * 1000;

  for (const m of metricDefs) {
    for (let s = 0; s < steps; s++) {
      const ts = new Date(now - (steps - s) * intervalMs);
      const hourOfDay = ts.getUTCHours();
      const diurnalFactor = 0.8 + 0.4 * Math.sin((hourOfDay / 24) * Math.PI * 2);
      const isSpike = s > steps - 35 && s < steps - 20;
      const spikeFactor = isSpike ? 1.8 : 1.0;
      
      const val = Math.max(0, (m.base * diurnalFactor * spikeFactor) + (Math.random() - 0.5) * m.var);

      rows.push({
        Timestamp: ts.toISOString().replace('T', ' ').replace('Z', ''),
        MetricName: m.name,
        Description: m.desc,
        Unit: m.unit,
        ServiceName: m.service,
        Value: parseFloat(val.toFixed(3)),
        Attributes: { 'host.name': 'k8s-node-01', 'env': 'production' },
      });
    }
  }

  await client.insert({
    table: 'otel_metrics_gauge',
    values: rows,
    format: 'JSONEachRow',
  });
  console.log(`✓ Inserted ${rows.length} timeseries metric data points (${steps} intervals per metric).`);
}

async function run() {
  console.log('\n========================================================');
  console.log('🌱 ClickStack: Seeding Comprehensive Telemetry Data');
  console.log('========================================================\n');

  try {
    await seedTraces();
    await seedLogs();
    await seedMetrics();
    console.log('\n🎉 Successfully seeded rich telemetry into ClickHouse!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
