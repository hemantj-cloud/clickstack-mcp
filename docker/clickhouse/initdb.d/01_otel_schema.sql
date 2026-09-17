CREATE DATABASE IF NOT EXISTS otel;

-- 1. OpenTelemetry Traces Table
CREATE TABLE IF NOT EXISTS otel.otel_traces (
    Timestamp DateTime64(9) CODEC(DoubleDelta, LZ4),
    TraceId String CODEC(ZSTD(1)),
    SpanId String CODEC(ZSTD(1)),
    ParentSpanId String CODEC(ZSTD(1)),
    TraceState String,
    SpanName LowCardinality(String),
    SpanKind LowCardinality(String),
    ServiceName LowCardinality(String),
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ScopeName String,
    ScopeVersion String,
    SpanAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    Duration UInt64 CODEC(T64, ZSTD(1)),
    StatusCode LowCardinality(String),
    StatusMessage String
) ENGINE = MergeTree()
ORDER BY (ServiceName, SpanName, toUnixTimestamp(Timestamp), TraceId);

-- 2. OpenTelemetry Logs Table
CREATE TABLE IF NOT EXISTS otel.otel_logs (
    Timestamp DateTime64(9) CODEC(DoubleDelta, LZ4),
    TraceId String CODEC(ZSTD(1)),
    SpanId String CODEC(ZSTD(1)),
    TraceFlags UInt32,
    SeverityText LowCardinality(String),
    SeverityNumber Int32,
    ServiceName LowCardinality(String),
    Body String CODEC(ZSTD(1)),
    ResourceAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    LogAttributes Map(LowCardinality(String), String) CODEC(ZSTD(1))
) ENGINE = MergeTree()
ORDER BY (ServiceName, SeverityText, toUnixTimestamp(Timestamp));

-- 3. OpenTelemetry Metrics (Gauge)
CREATE TABLE IF NOT EXISTS otel.otel_metrics_gauge (
    Timestamp DateTime64(9) CODEC(DoubleDelta, LZ4),
    MetricName LowCardinality(String),
    Description String,
    Unit String,
    ServiceName LowCardinality(String),
    Value Float64,
    Attributes Map(LowCardinality(String), String) CODEC(ZSTD(1))
) ENGINE = MergeTree()
ORDER BY (MetricName, ServiceName, toUnixTimestamp(Timestamp));
