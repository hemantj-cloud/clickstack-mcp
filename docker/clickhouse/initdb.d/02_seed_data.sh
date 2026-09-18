#!/bin/sh
set -e

echo "==> Seeding OpenTelemetry telemetry into ClickHouse..."

clickhouse-client -d otel --multiquery << 'EOF'
-- 1. Insert Multi-Tier Production Traces
INSERT INTO otel.otel_traces SELECT now64(9) - INTERVAL 12 MINUTE, '7b3f9104e1a89c2fa394bc21890e44b1', 'span_01', '', '', 'POST /api/v1/orders/checkout', 'Server', 'checkout-service', map('cloud.region', 'us-east-1', 'host.name', 'k8s-worker-01'), 'checkout-tracer', '1.2.0', map('http.method', 'POST', 'http.route', '/api/v1/orders/checkout', 'http.status_code', '500', 'user.id', 'usr_94821'), 2412350000, 'error', 'Downstream lock timeout';
INSERT INTO otel.otel_traces SELECT now64(9) - INTERVAL 12 MINUTE + INTERVAL 12 MILLISECOND, '7b3f9104e1a89c2fa394bc21890e44b1', 'span_02', 'span_01', '', 'POST /v1/tokens/verify', 'Client', 'auth-service', map('cloud.region', 'us-east-1'), 'auth-tracer', '1.0.0', map('http.method', 'POST', 'http.status_code', '200', 'auth.type', 'Bearer'), 45200000, 'ok', '';
INSERT INTO otel.otel_traces SELECT now64(9) - INTERVAL 12 MINUTE + INTERVAL 65 MILLISECOND, '7b3f9104e1a89c2fa394bc21890e44b1', 'span_03', 'span_01', '', 'POST /v2/inventory/lock', 'Client', 'inventory-service', map('cloud.region', 'us-east-1'), 'inventory-tracer', '2.0.0', map('http.status_code', '504', 'db.system', 'postgresql', 'error.type', 'LockTimeoutException'), 2210800000, 'error', 'Transaction lock timeout exceeded';
INSERT INTO otel.otel_traces SELECT now64(9) - INTERVAL 12 MINUTE + INTERVAL 70 MILLISECOND, '7b3f9104e1a89c2fa394bc21890e44b1', 'span_04', 'span_03', '', 'postgres.query: inventory_lock', 'Internal', 'postgres-db', map('cloud.region', 'us-east-1'), 'db-tracer', '1.0.0', map('db.operation', 'SELECT', 'db.table', 'inventory', 'db.statement', 'SELECT * FROM inventory WHERE product_id = 9842 FOR UPDATE'), 2200000000, 'error', 'Query wait timeout';
INSERT INTO otel.otel_traces SELECT now64(9) - INTERVAL 12 MINUTE + INTERVAL 2280 MILLISECOND, '7b3f9104e1a89c2fa394bc21890e44b1', 'span_05', 'span_01', '', 'POST /v1/charges', 'Client', 'payment-service', map('cloud.region', 'us-east-1'), 'payment-tracer', '1.1.0', map('payment.provider', 'stripe', 'http.status_code', '200'), 120000000, 'ok', '';

INSERT INTO otel.otel_traces SELECT now64(9) - INTERVAL 8 MINUTE, '8c4e1205f2b90d3eb405cd32901f55c2', 'span_10', '', '', 'POST /api/v1/orders/checkout', 'Server', 'checkout-service', map('cloud.region', 'us-east-1'), 'checkout-tracer', '1.2.0', map('http.method', 'POST', 'http.route', '/api/v1/orders/checkout', 'http.status_code', '200', 'user.id', 'usr_10293'), 185000000, 'ok', '';
INSERT INTO otel.otel_traces SELECT now64(9) - INTERVAL 8 MINUTE + INTERVAL 10 MILLISECOND, '8c4e1205f2b90d3eb405cd32901f55c2', 'span_11', 'span_10', '', 'POST /v1/tokens/verify', 'Client', 'auth-service', map('cloud.region', 'us-east-1'), 'auth-tracer', '1.0.0', map('http.status_code', '200'), 35000000, 'ok', '';
INSERT INTO otel.otel_traces SELECT now64(9) - INTERVAL 8 MINUTE + INTERVAL 45 MILLISECOND, '8c4e1205f2b90d3eb405cd32901f55c2', 'span_12', 'span_10', '', 'POST /v2/inventory/lock', 'Client', 'inventory-service', map('cloud.region', 'us-east-1'), 'inventory-tracer', '2.0.0', map('http.status_code', '200', 'db.system', 'postgresql'), 42000000, 'ok', '';

INSERT INTO otel.otel_traces SELECT now64(9) - INTERVAL 4 MINUTE, '9d5f2316a3c01e4fc516de43012a66d3', 'span_20', '', '', 'GET /api/v1/products/list', 'Server', 'api-gateway', map('cloud.region', 'us-east-1'), 'gateway-tracer', '1.4.0', map('http.method', 'GET', 'http.route', '/api/v1/products/list', 'http.status_code', '200'), 38000000, 'ok', '';
INSERT INTO otel.otel_traces SELECT now64(9) - INTERVAL 4 MINUTE + INTERVAL 5 MILLISECOND, '9d5f2316a3c01e4fc516de43012a66d3', 'span_21', 'span_20', '', 'redis.get: product_catalog', 'Internal', 'redis-cache', map('cloud.region', 'us-east-1'), 'redis-tracer', '1.0.0', map('db.system', 'redis', 'db.operation', 'GET'), 4500000, 'ok', '';

-- 2. Insert Correlated Logs
INSERT INTO otel.otel_logs SELECT now64(9) - INTERVAL 12 MINUTE + INTERVAL 100 MILLISECOND, '7b3f9104e1a89c2fa394bc21890e44b1', 'span_01', 1, 'INFO', 9, 'checkout-service', 'Order checkout initiated for cart #84210', map('cloud.region', 'us-east-1'), map('user.id', 'usr_94821');
INSERT INTO otel.otel_logs SELECT now64(9) - INTERVAL 12 MINUTE + INTERVAL 200 MILLISECOND, '7b3f9104e1a89c2fa394bc21890e44b1', 'span_03', 1, 'INFO', 9, 'inventory-service', 'Acquiring lock on row #9842 in inventory table', map('cloud.region', 'us-east-1'), map('product.id', '9842');
INSERT INTO otel.otel_logs SELECT now64(9) - INTERVAL 12 MINUTE + INTERVAL 2350 MILLISECOND, '7b3f9104e1a89c2fa394bc21890e44b1', 'span_03', 1, 'WARN', 13, 'inventory-service', 'Transaction wait timeout exceeded (>2000ms) on row lock product_id 9842', map('cloud.region', 'us-east-1'), map('error.code', 'LOCK_TIMEOUT');
INSERT INTO otel.otel_logs SELECT now64(9) - INTERVAL 12 MINUTE + INTERVAL 2400 MILLISECOND, '7b3f9104e1a89c2fa394bc21890e44b1', 'span_01', 1, 'ERROR', 17, 'checkout-service', 'Order processing failed due to downstream database lock timeout in inventory table', map('cloud.region', 'us-east-1'), map('http.status_code', '500');
INSERT INTO otel.otel_logs SELECT now64(9) - INTERVAL 5 MINUTE, '', '', 0, 'INFO', 9, 'ingress-nginx', 'HealthCheck ping received from IP 10.0.4.12, status: 200 OK', map('cloud.region', 'us-east-1'), map();
INSERT INTO otel.otel_logs SELECT now64(9) - INTERVAL 4 MINUTE, '', '', 0, 'INFO', 9, 'ingress-nginx', 'HealthCheck ping received from IP 10.0.4.14, status: 200 OK', map('cloud.region', 'us-east-1'), map();
INSERT INTO otel.otel_logs SELECT now64(9) - INTERVAL 2 MINUTE, '', '', 0, 'WARN', 13, 'auth-service', 'JWT token verification failed for user usr_invalid_984', map('cloud.region', 'us-east-1'), map('error.reason', 'token_expired');

-- 3. Insert Host & Container Metrics
INSERT INTO otel.otel_metrics_gauge SELECT now64(9) - INTERVAL 30 MINUTE, 'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.35, map('host.name', 'k8s-node-01');
INSERT INTO otel.otel_metrics_gauge SELECT now64(9) - INTERVAL 25 MINUTE, 'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.38, map('host.name', 'k8s-node-01');
INSERT INTO otel.otel_metrics_gauge SELECT now64(9) - INTERVAL 20 MINUTE, 'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.42, map('host.name', 'k8s-node-01');
INSERT INTO otel.otel_metrics_gauge SELECT now64(9) - INTERVAL 15 MINUTE, 'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.72, map('host.name', 'k8s-node-01');
INSERT INTO otel.otel_metrics_gauge SELECT now64(9) - INTERVAL 10 MINUTE, 'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.94, map('host.name', 'k8s-node-01');
INSERT INTO otel.otel_metrics_gauge SELECT now64(9) - INTERVAL 5 MINUTE,  'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.88, map('host.name', 'k8s-node-01');
INSERT INTO otel.otel_metrics_gauge SELECT now64(9),                     'system.cpu.utilization', 'Host CPU utilization ratio', '1', 'checkout-service', 0.41, map('host.name', 'k8s-node-01');

INSERT INTO otel.otel_metrics_gauge SELECT now64(9) - INTERVAL 30 MINUTE, 'system.memory.usage', 'Host RAM usage bytes', 'By', 'checkout-service', 8589934592, map('host.name', 'k8s-node-01');
INSERT INTO otel.otel_metrics_gauge SELECT now64(9) - INTERVAL 10 MINUTE, 'system.memory.usage', 'Host RAM usage bytes', 'By', 'checkout-service', 14210934592, map('host.name', 'k8s-node-01');
INSERT INTO otel.otel_metrics_gauge SELECT now64(9),                     'system.memory.usage', 'Host RAM usage bytes', 'By', 'checkout-service', 9128000000, map('host.name', 'k8s-node-01');

INSERT INTO otel.otel_metrics_gauge SELECT now64(9) - INTERVAL 30 MINUTE, 'k8s.pod.cpu.utilization', 'K8s pod CPU ratio', '1', 'inventory-service', 0.28, map('pod.name', 'inventory-service-67b-x8');
INSERT INTO otel.otel_metrics_gauge SELECT now64(9) - INTERVAL 10 MINUTE, 'k8s.pod.cpu.utilization', 'K8s pod CPU ratio', '1', 'inventory-service', 0.96, map('pod.name', 'inventory-service-67b-x8');
INSERT INTO otel.otel_metrics_gauge SELECT now64(9),                     'k8s.pod.cpu.utilization', 'K8s pod CPU ratio', '1', 'inventory-service', 0.32, map('pod.name', 'inventory-service-67b-x8');

INSERT INTO otel.otel_metrics_gauge SELECT now64(9) - INTERVAL 30 MINUTE, 'process.threads', 'Process active thread count', '1', 'checkout-service', 48.0, map('host.name', 'k8s-node-01');
INSERT INTO otel.otel_metrics_gauge SELECT now64(9) - INTERVAL 10 MINUTE, 'process.threads', 'Process active thread count', '1', 'checkout-service', 184.0, map('host.name', 'k8s-node-01');
INSERT INTO otel.otel_metrics_gauge SELECT now64(9),                     'process.threads', 'Process active thread count', '1', 'checkout-service', 52.0, map('host.name', 'k8s-node-01');
EOF

echo "==> Telemetry seeding complete!"
