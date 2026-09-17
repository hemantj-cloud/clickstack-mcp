/**
 * Comprehensive Automated Tool Suite Verification for ClickStack MCP
 * Tests every single one of the 27 tools via Streamable HTTP JSON-RPC 2.0.
 */

const ENDPOINT = process.env.MCP_ENDPOINT || 'http://localhost:3000/mcp';

const toolsToTest = [
  // 1. Sources & Metrics (6 tools)
  {
    name: 'clickstack_list_sources',
    args: {},
  },
  {
    name: 'clickstack_describe_source',
    args: { sourceId: 'src_trace_prod_01' },
  },
  {
    name: 'clickstack_list_metrics',
    args: { sourceId: 'src_metric_prod_01' },
  },
  {
    name: 'clickstack_describe_metric',
    args: { sourceId: 'src_metric_prod_01', metricName: 'system.cpu.utilization' },
  },
  {
    name: 'clickstack_save_source',
    args: {
      id: 'src_test_ephemeral',
      name: 'Test Ephemeral Source',
      kind: 'trace',
      connection: 'conn_clickhouse_local',
      databaseName: 'otel',
      tableName: 'otel_traces',
    },
  },
  {
    name: 'clickstack_delete_source',
    args: { sourceId: 'src_test_ephemeral' },
  },

  // 2. Traces (2 tools)
  {
    name: 'clickstack_trace_waterfall',
    args: { sourceId: 'src_trace_prod_01' },
  },
  {
    name: 'clickstack_trace_top_time_consuming_operations',
    args: {
      sourceId: 'src_trace_prod_01',
      parentFilter: 'SpanName:"POST /api/v1/orders/checkout"',
    },
  },

  // 3. Query & Analytics (7 tools)
  {
    name: 'clickstack_timeseries',
    args: { sourceId: 'src_metric_prod_01', granularity: '5m' },
  },
  {
    name: 'clickstack_table',
    args: { sourceId: 'src_trace_prod_01', shape: 'table' },
  },
  {
    name: 'clickstack_search',
    args: { sourceId: 'src_log_prod_01', denoise: false },
  },
  {
    name: 'clickstack_event_patterns',
    args: { sourceId: 'src_log_prod_01', sampleSize: 200 },
  },
  {
    name: 'clickstack_event_deltas',
    args: {
      sourceId: 'src_log_prod_01',
      target: { where: "SeverityText = 'ERROR'", whereLanguage: 'sql' },
      baseline: { where: "SeverityText = 'INFO'", whereLanguage: 'sql' },
    },
  },
  {
    name: 'clickstack_emerging_signals',
    args: { sourceId: 'src_log_prod_01', minShareRatio: 1.5 },
  },
  {
    name: 'clickstack_sql',
    args: { connectionId: 'conn_clickhouse_local', query: 'SELECT 1 AS test_ok' },
  },

  // 4. Dashboards (7 tools)
  {
    name: 'clickstack_get_dashboard',
    args: { id: 'dash_api_overview' },
  },
  {
    name: 'clickstack_get_dashboard_tile',
    args: { dashboardId: 'dash_api_overview', tileId: 'tile_kpi_error' },
  },
  {
    name: 'clickstack_save_dashboard',
    args: {
      id: 'dash_ephemeral_test',
      name: 'Ephemeral Test Dashboard',
      tags: ['test', 'ci'],
      tiles: [],
    },
  },
  {
    name: 'clickstack_patch_dashboard',
    args: {
      id: 'dash_ephemeral_test',
      patch: { name: 'Patched Test Dashboard' },
    },
  },
  {
    name: 'clickstack_delete_dashboard',
    args: { id: 'dash_ephemeral_test' },
  },
  {
    name: 'clickstack_query_tile',
    args: { dashboardId: 'dash_api_overview', tileId: 'tile_kpi_error' },
  },
  {
    name: 'clickstack_query_tiles',
    args: { dashboardId: 'dash_api_overview' },
  },

  // 5. Alerts & Webhooks (5 tools)
  {
    name: 'clickstack_get_alert',
    args: { id: 'alert_p99_spike' },
  },
  {
    name: 'clickstack_save_alert',
    args: {
      id: 'alert_p99_spike',
      name: 'Checkout P99 Latency Surge',
      interval: '5m',
      threshold: 2000,
      thresholdType: 'above',
    },
  },
  {
    name: 'clickstack_get_webhook',
    args: { id: 'wh_slack_sre' },
  },
  {
    name: 'clickstack_save_webhook',
    args: {
      id: 'wh_test_ephemeral',
      name: 'Ephemeral Webhook',
      service: 'slack',
      url: 'https://hooks.slack.com/services/test',
    },
  },
  {
    name: 'clickstack_delete_webhook',
    args: { id: 'wh_test_ephemeral' },
  },
];

async function callTool(name, args, id) {
  const payload = {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name,
      arguments: args,
    },
  };

  const startTime = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(payload),
    });

    const elapsedMs = Date.now() - startTime;
    const text = await res.text();

    // Parse SSE or JSON response
    let json = null;
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          json = JSON.parse(line.substring(6));
          break;
        } catch {}
      }
    }
    if (!json) {
      try {
        json = JSON.parse(text);
      } catch {}
    }

    if (json?.error) {
      return {
        success: false,
        name,
        elapsedMs,
        error: json.error.message || JSON.stringify(json.error),
      };
    }

    const hasContent = !!(json?.result?.content || json?.result?.structuredContent);
    return {
      success: true,
      name,
      elapsedMs,
      hasContent,
      preview: JSON.stringify(json?.result).slice(0, 80) + '...',
    };
  } catch (err) {
    return {
      success: false,
      name,
      elapsedMs: Date.now() - startTime,
      error: err.message,
    };
  }
}

async function run() {
  console.log(`\n=============================================================`);
  console.log(`🚀 ClickStack MCP: Running Verification on All 27 Tools`);
  console.log(`🎯 Target Endpoint: ${ENDPOINT}`);
  console.log(`=============================================================\n`);

  const results = [];
  let passed = 0;
  let failed = 0;

  for (let i = 0; i < toolsToTest.length; i++) {
    const tool = toolsToTest[i];
    process.stdout.write(`[${i + 1}/${toolsToTest.length}] Testing ${tool.name.padEnd(46)} `);
    const res = await callTool(tool.name, tool.args, i + 1);
    results.push(res);

    if (res.success) {
      passed++;
      console.log(`✅ PASS (${res.elapsedMs}ms)`);
    } else {
      failed++;
      console.log(`❌ FAIL (${res.elapsedMs}ms): ${res.error}`);
    }
  }

  console.log(`\n=============================================================`);
  console.log(`📊 Test Results: ${passed}/${toolsToTest.length} Passed, ${failed} Failed`);
  console.log(`=============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run();
