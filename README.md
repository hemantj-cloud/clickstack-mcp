# ClickStack MCP Server (NitroStack 2.0 Edition)

An enterprise-grade, stateless Model Context Protocol (MCP) server for ClickStack observability, powered by the [NitroStack SDK](https://nitrostack.ai) and Next.js 14 Ext-Apps widgets (`@modelcontextprotocol/ext-apps`).

## ⚡ Overview

The ClickStack MCP server bridges LLM conversational clients (Anthropic Claude, Cursor, OpenAI ChatGPT, Google Gemini) directly with ClickHouse-backed telemetry data (traces, spans, logs, and metrics).

Instead of forcing AI models to formulate raw SQL or parsing massive text dumps, this server provides:
- **High-level domain tools** for fast investigation and root-cause analysis (`clickstack_event_deltas`, `clickstack_event_patterns`, `clickstack_emerging_signals`).
- **7 interactive Ext-Apps widgets** that render inside conversational windows (distributed trace waterfalls, timeseries graphs, divergence bars, Drain clustering accordions, dashboard grids, alert backtesters, and metric cardinality inspectors).
- **Mandatory ClickHouse sandboxing** (`readonly: '2'`, 10GB max memory, 60s timeout).
- **OAuth 2.1 PKCE verification** with in-memory token verification caching.
- **Dual protocol stateless architecture** (supporting modern `2026-07-28` stateless wire format and legacy session transports).

---

## 🛠️ Observability Tools Suite (27 Production Tools)

| Module | Tool Name | Description | Interactive Widget |
|---|---|---|---|
| **Sources** (6) | `clickstack_list_sources` | List all telemetry sources and database connections | — |
| | `clickstack_describe_source` | Return column schemas, map keys, and sampled values | — |
| | `clickstack_list_metrics` | Catalog metric names with kind and pattern filters | `/metric-inspector` |
| | `clickstack_describe_metric` | Drill into metric attributes, percentiles, and cardinality | `/metric-inspector` |
| | `clickstack_save_source` | Create or update a telemetry data source | — |
| | `clickstack_delete_source` | Delete a data source | — |
| **Query** (7) | `clickstack_timeseries` | Plot metrics over time as lines or stacked bars | `/timeseries-chart` |
| | `clickstack_table` | Compute table aggregates, single numbers (KPI), or pie charts | `/timeseries-chart` |
| | `clickstack_search` | Search raw logs, events, or spans with noise filtering | `/log-patterns` |
| | `clickstack_event_patterns` | Discover log templates via Drain clustering | `/log-patterns` |
| | `clickstack_event_deltas` | Rank attributes by distribution divergence (Root Cause) | `/event-deltas` |
| | `clickstack_emerging_signals` | Detect newly emerging or vanishing log patterns | `/log-patterns` |
| | `clickstack_sql` | Execute sandboxed ClickHouse SQL (last resort) | — |
| **Trace** (2) | `clickstack_trace_waterfall` | Waterfall trace viewer with critical path calculation | `/trace-waterfall` |
| | `clickstack_trace_top_time_consuming_operations` | Latency contribution breakdown across child operations | `/trace-waterfall` |
| **Dashboards** (7)| `clickstack_get_dashboard` | Retrieve dashboard metadata and multi-tile layout | `/dashboard-canvas` |
| | `clickstack_get_dashboard_tile` | Inspect a single dashboard tile configuration | — |
| | `clickstack_save_dashboard` | Create or update an operational dashboard | `/dashboard-canvas` |
| | `clickstack_patch_dashboard` | Apply partial updates to dashboard tiles | — |
| | `clickstack_delete_dashboard` | Delete an operational dashboard | — |
| | `clickstack_query_tile` | Execute a single tile query with live validation | — |
| | `clickstack_query_tiles` | Batch-execute and validate all queries across a dashboard | `/dashboard-canvas` |
| **Alerts** (5) | `clickstack_get_alert` | Get alert rule detail, thresholds, and evaluation history | `/alert-studio` |
| | `clickstack_save_alert` | Create or update alert monitors with backtest simulation | `/alert-studio` |
| | `clickstack_get_webhook` | List notification destinations (Slack, Incident.io, PD) | — |
| | `clickstack_save_webhook` | Create or update a notification webhook | — |
| | `clickstack_delete_webhook` | Delete a notification webhook | — |

---

## 🎨 Interactive Widgets (`src/widgets`)

1. **`/trace-waterfall`**: Interactive Gantt chart and flamegraph highlighting critical path latency, inline span logs, and one-shot delta drilldowns.
2. **`/timeseries-chart`**: Multi-series metric visualization with anomaly windows, dual Y-axis scaling, and point-in-time tooltip inspection.
3. **`/event-deltas`**: Divergence comparison between target and baseline event cohorts (e.g. slow vs fast, errors vs healthy).
4. **`/log-patterns`**: Drain log clustering template accordion with live noise suppression toggle and sample counts.
5. **`/dashboard-canvas`**: Operational grid rendering KPI cards, line charts, error tables, and tile query validation.
6. **`/alert-studio`**: Rule configuration with historical "What-If" backtest slider, noise reduction calculations, and Slack notification preview.
7. **`/metric-inspector`**: Empirical percentile distribution curve (p50-p99), dimension cardinality cloud with high-cardinality warnings, and ClickHouse rollup engine advisor.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 20.0.0
- ClickHouse Cloud or self-hosted instance (optional for mock mode)

### 2. Install & Build
```bash
# Install root dependencies
npm install

# Install widget dependencies
npm run widget install

# Build widgets and TypeScript backend
npm run build
```

### 3. Start Server
```bash
# Start production MCP server
npm start

# Or run in development mode with live reload
npm run dev
```

### 4. Configuration (`.env`)
```bash
# ClickHouse Connection
CLICKHOUSE_URL=https://your-instance.clickhouse.cloud:8443
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your-secure-password
CLICKHOUSE_DATABASE=default

# Stateless Security Sandbox
CLICKHOUSE_READONLY=2
CLICKHOUSE_MAX_EXECUTION_TIME_SEC=60
CLICKHOUSE_MAX_MEMORY_USAGE=10737418240

# OAuth 2.1 PKCE (Optional)
CLICKSTACK_OAUTH_ENABLED=false
CLICKSTACK_JWKS_URI=https://auth.clickhouse.cloud/.well-known/jwks.json
CLICKSTACK_AUDIENCE=clickstack-mcp
CLICKSTACK_ISSUER=https://auth.clickhouse.cloud/
```

---

## 🔒 Security & Sandboxing Guarantee

- **Strict ClickHouse Read-Only (`readonly = 2`)**: Rejects all DDL, table drops, mutations, system commands, and setting overrides at the ClickHouse engine protocol level.
- **Resource Limits**: 60-second query execution limit and 10GB maximum RAM consumption ceiling per query execution.
- **No Long-Lived State**: Completely stateless server instances suitable for multi-region deployment on Cloudflare Workers, AWS Lambda, Kubernetes, or Fly.io.

---

## 📄 License
MIT © ClickStack Team
