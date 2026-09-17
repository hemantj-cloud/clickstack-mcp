-- ============================================================================
-- Seed Production Telemetry Data for OpenTelemetry in ClickHouse
-- ============================================================================

-- 1. Insert Production Traces
INSERT INTO otel.otel_traces (
    Timestamp, TraceId, SpanId, ParentSpanId, TraceState,
    SpanName, SpanKind, ServiceName, ResourceAttributes,
    ScopeName, ScopeVersion, SpanAttributes, Duration, StatusCode, StatusMessage
) VALUES
-- Trace 1: Checkout Failure with DB Lock
('2026-09-17 18:22:00.000000000', '7b3f9104e1a89c2fa394bc21890e44b1', 'span_01', '', '',
 'POST /api/v1/orders/checkout', 'Server', 'checkout-service', map('cloud.region', 'us-east-1', 'host.name', 'k8s-worker-01'),
 'checkout-tracer', '1.2.0', map('http.method', 'POST', 'http.route', '/api/v1/orders/checkout', 'http.status_code', '500', 'user.id', 'usr_94821'),
 2412350000, 'error', 'Downstream lock timeout'),

('2026-09-17 18:22:00.012400000', '7b3f9104e1a89c2fa394bc21890e44b1', 'span_02', 'span_01', '',
 'POST /v1/tokens/verify', 'Client', 'auth-service', map('cloud.region', 'us-east-1'),
 'auth-tracer', '1.0.0', map('http.method', 'POST', 'http.status_code', '200', 'auth.type', 'Bearer'),
 45200000, 'ok', ''),

('2026-09-17 18:22:00.065100000', '7b3f9104e1a89c2fa394bc21890e44b1', 'span_03', 'span_01', '',
 'POST /v2/inventory/lock', 'Client', 'inventory-service', map('cloud.region', 'us-east-1'),
 'inventory-tracer', '2.0.0', map('http.status_code', '504', 'db.system', 'postgresql', 'error.type', 'LockTimeoutException'),
 2210800000, 'error', 'Transaction lock timeout exceeded'),

('2026-09-17 18:22:00.070000000', '7b3f9104e1a89c2fa394bc21890e44b1', 'span_04', 'span_03', '',
 'postgres.query: inventory_lock', 'Internal', 'postgres-db', map('cloud.region', 'us-east-1'),
 'db-tracer', '1.0.0', map('db.operation', 'SELECT', 'db.table', 'inventory', 'db.statement', 'SELECT * FROM inventory WHERE product_id = 9842 FOR UPDATE'),
 2200000000, 'error', 'Query wait timeout'),

('2026-09-17 18:22:02.280000000', '7b3f9104e1a89c2fa394bc21890e44b1', 'span_05', 'span_01', '',
 'POST /v1/charges', 'Client', 'payment-service', map('cloud.region', 'us-east-1'),
 'payment-tracer', '1.1.0', map('payment.provider', 'stripe', 'http.status_code', '200'),
 120000000, 'ok', ''),

('2026-09-17 18:22:02.290000000', '7b3f9104e1a89c2fa394bc21890e44b1', 'span_06', 'span_05', '',
 'stripe.api: POST /v1/charges', 'Client', 'stripe-api', map('cloud.region', 'us-east-1'),
 'http-tracer', '1.0.0', map('http.host', 'api.stripe.com', 'http.status_code', '200'),
 105000000, 'ok', ''),

-- Trace 2: Healthy Checkout Trace
('2026-09-17 18:23:00.000000000', '8c4e1205f2b90d3eb405cd32901f55c2', 'span_10', '', '',
 'POST /api/v1/orders/checkout', 'Server', 'checkout-service', map('cloud.region', 'us-east-1'),
 'checkout-tracer', '1.2.0', map('http.method', 'POST', 'http.route', '/api/v1/orders/checkout', 'http.status_code', '200', 'user.id', 'usr_10293'),
 185000000, 'ok', ''),

('2026-09-17 18:23:00.010000000', '8c4e1205f2b90d3eb405cd32901f55c2', 'span_11', 'span_10', '',
 'POST /v1/tokens/verify', 'Client', 'auth-service', map('cloud.region', 'us-east-1'),
 'auth-tracer', '1.0.0', map('http.status_code', '200'),
 35000000, 'ok', ''),

('2026-09-17 18:23:00.045000000', '8c4e1205f2b90d3eb405cd32901f55c2', 'span_12', 'span_10', '',
 'POST /v2/inventory/lock', 'Client', 'inventory-service', map('cloud.region', 'us-east-1'),
 'inventory-tracer', '2.0.0', map('http.status_code', '200', 'db.system', 'postgresql'),
 42000000, 'ok', '');

-- 2. Insert Correlated Logs
INSERT INTO otel.otel_logs (
    Timestamp, TraceId, SpanId, TraceFlags,
    SeverityText, SeverityNumber, ServiceName, Body, ResourceAttributes, LogAttributes
) VALUES
('2026-09-17 18:22:00.100000000', '7b3f9104e1a89c2fa394bc21890e44b1', 'span_01', 1,
 'INFO', 9, 'checkout-service', 'Order checkout initiated for cart #84210',
 map('cloud.region', 'us-east-1'), map('user.id', 'usr_94821')),

('2026-09-17 18:22:00.200000000', '7b3f9104e1a89c2fa394bc21890e44b1', 'span_03', 1,
 'INFO', 9, 'inventory-service', 'Acquiring lock on row #9842 in inventory table',
 map('cloud.region', 'us-east-1'), map('product.id', '9842')),

('2026-09-17 18:22:02.350000000', '7b3f9104e1a89c2fa394bc21890e44b1', 'span_03', 1,
 'WARN', 13, 'inventory-service', 'Transaction wait timeout exceeded (>2000ms) on row lock product_id 9842',
 map('cloud.region', 'us-east-1'), map('error.code', 'LOCK_TIMEOUT')),

('2026-09-17 18:22:02.400000000', '7b3f9104e1a89c2fa394bc21890e44b1', 'span_01', 1,
 'ERROR', 17, 'checkout-service', 'Order processing failed due to downstream database lock timeout in inventory table',
 map('cloud.region', 'us-east-1'), map('http.status_code', '500')),

('2026-09-17 18:21:59.000000000', '', '', 0,
 'INFO', 9, 'ingress-nginx', 'HealthCheck ping received from IP 10.0.4.12, status: 200 OK',
 map('cloud.region', 'us-east-1'), map()),

('2026-09-17 18:21:58.000000000', '', '', 0,
 'INFO', 9, 'ingress-nginx', 'HealthCheck ping received from IP 10.0.4.14, status: 200 OK',
 map('cloud.region', 'us-east-1'), map()),

('2026-09-17 18:20:15.000000000', '', '', 0,
 'WARN', 13, 'auth-service', 'JWT token verification failed for user usr_invalid_984',
 map('cloud.region', 'us-east-1'), map('error.reason', 'token_expired'));

-- 3. Insert Host & Container Metrics
INSERT INTO otel.otel_metrics_gauge (
    Timestamp, MetricName, Description, Unit, ServiceName, Value, Attributes
) VALUES
('2026-09-17 18:00:00.000000000', 'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.35, map('host.name', 'k8s-node-01')),
('2026-09-17 18:05:00.000000000', 'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.38, map('host.name', 'k8s-node-01')),
('2026-09-17 18:10:00.000000000', 'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.42, map('host.name', 'k8s-node-01')),
('2026-09-17 18:15:00.000000000', 'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.72, map('host.name', 'k8s-node-01')),
('2026-09-17 18:20:00.000000000', 'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.94, map('host.name', 'k8s-node-01')),
('2026-09-17 18:25:00.000000000', 'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.88, map('host.name', 'k8s-node-01')),
('2026-09-17 18:30:00.000000000', 'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.41, map('host.name', 'k8s-node-01')),

('2026-09-17 18:00:00.000000000', 'system.memory.usage', 'Host RAM usage bytes', 'By', 'checkout-service', 8589934592, map('host.name', 'k8s-node-01')),
('2026-09-17 18:20:00.000000000', 'system.memory.usage', 'Host RAM usage bytes', 'By', 'checkout-service', 14210934592, map('host.name', 'k8s-node-01')),

('2026-09-17 18:00:00.000000000', 'k8s.pod.cpu.utilization', 'K8s pod CPU ratio', '1', 'inventory-service', 0.28, map('pod.name', 'inventory-service-67b-x8')),
('2026-09-17 18:20:00.000000000', 'k8s.pod.cpu.utilization', 'K8s pod CPU ratio', '1', 'inventory-service', 0.96, map('pod.name', 'inventory-service-67b-x8')),

('2026-09-17 18:00:00.000000000', 'process.threads', 'Process active thread count', '1', 'checkout-service', 48.0, map('host.name', 'k8s-node-01')),
('2026-09-17 18:20:00.000000000', 'process.threads', 'Process active thread count', '1', 'checkout-service', 184.0, map('host.name', 'k8s-node-01'));
