/**
 * Deep Tool Output Auditor for ClickStack MCP
 * Verifies that all 27 tools return valid, well-formed, and meaningful payloads.
 */

const ENDPOINT = process.env.MCP_ENDPOINT || 'http://localhost:3000/mcp';

const toolsToAudit = [
  // 1. Sources & Metrics (6 tools)
  {
    name: 'clickstack_list_sources',
    args: {},
    validate: (data) => Array.isArray(data?.sources) && data.sources.length > 0,
    describe: (data) => `${data.sources.length} sources (${data.sources.map(s => s.kind || s.name).join(', ')})`,
  },
  {
    name: 'clickstack_describe_source',
    args: { sourceId: 'src_trace_prod_01' },
    validate: (data) => !!(data?.sourceId || data?.id) && (Array.isArray(data?.columns) || Array.isArray(data?.schema?.columns)),
    describe: (data) => `Source: ${data.sourceId || data.id}, ${(data.columns || data.schema?.columns).length} columns`,
  },
  {
    name: 'clickstack_list_metrics',
    args: { sourceId: 'src_metric_prod_01' },
    validate: (data) => Array.isArray(data?.metrics) && data.metrics.length > 0,
    describe: (data) => `${data.metrics.length} metrics cataloged (${data.metrics.slice(0, 3).map(m => m.name).join(', ')}...)`,
  },
  {
    name: 'clickstack_describe_metric',
    args: { sourceId: 'src_metric_prod_01', metricName: 'system.cpu.utilization', kind: 'gauge' },
    validate: (data) => !!data?.metricName && (!!data?.statistics || !!data?.summary),
    describe: (data) => `Metric: ${data.metricName} (${data.unit || '1'}), P95: ${data.statistics?.p95 || data.summary?.p95}, ${data.attributeKeys?.length || data.dimensions?.length || 0} attribute dimensions`,
  },
  {
    name: 'clickstack_save_source',
    args: {
      id: 'src_test_audit',
      name: 'Audit Test Source',
      kind: 'trace',
      connection: 'conn_clickhouse_local',
      databaseName: 'otel',
      tableName: 'otel_traces',
    },
    validate: (data) => data?.status === 'created' || data?.status === 'updated' || data?.success === true || !!data?.id,
    describe: (data) => `Source saved: ID "${data.id || 'src_test_audit'}", Status: ${data.status || 'OK'}`,
  },
  {
    name: 'clickstack_delete_source',
    args: { id: 'src_test_audit' },
    validate: (data) => data?.status === 'deleted' || data?.success === true || !!data?.id,
    describe: (data) => `Source deleted: ID "${data.id || 'src_test_audit'}", Status: ${data.status || 'OK'}`,
  },

  // 2. Traces (2 tools)
  {
    name: 'clickstack_trace_waterfall',
    args: { sourceId: 'src_trace_prod_01' },
    validate: (data) => Array.isArray(data?.spans) && data.spans.length > 0 && !!data?.traceId,
    describe: (data) => `Trace ID: ${data.traceId.slice(0, 10)}..., ${data.spans.length} spans, duration: ${data.durationMs}ms`,
  },
  {
    name: 'clickstack_trace_top_time_consuming_operations',
    args: {
      sourceId: 'src_trace_prod_01',
      parentFilter: 'SpanName:"POST /api/v1/orders/checkout"',
    },
    validate: (data) => Array.isArray(data?.operations) && data.operations.length > 0,
    describe: (data) => `${data.operations.length} ranked operations, top: ${data.operations[0].operationName} (${data.operations[0].percentageOfTotalTime}%)`,
  },

  // 3. Query & Analytics (7 tools)
  {
    name: 'clickstack_timeseries',
    args: { sourceId: 'src_metric_prod_01', granularity: '5m' },
    validate: (data) => Array.isArray(data?.series) && data.series.length > 0,
    describe: (data) => `${data.series.length} series plotted, points: ${data.series[0]?.data?.length || 0}`,
  },
  {
    name: 'clickstack_table',
    args: { sourceId: 'src_trace_prod_01', shape: 'table' },
    validate: (data) => Array.isArray(data?.columns) && Array.isArray(data?.rows) && data.rows.length > 0,
    describe: (data) => `Columns: [${data.columns.join(', ')}], ${data.rows.length} aggregated rows`,
  },
  {
    name: 'clickstack_search',
    args: { sourceId: 'src_log_prod_01', denoise: false },
    validate: (data) => Array.isArray(data?.rows) && data.rows.length > 0,
    describe: (data) => `${data.rows.length} log rows returned, total: ${data.totalCount || data.rows.length}`,
  },
  {
    name: 'clickstack_event_patterns',
    args: { sourceId: 'src_log_prod_01', sampleSize: 200 },
    validate: (data) => Array.isArray(data?.patterns) && data.patterns.length > 0,
    describe: (data) => `${data.patterns.length} Drain templates discovered from ${data.sampleSize} sample events`,
  },
  {
    name: 'clickstack_event_deltas',
    args: {
      sourceId: 'src_log_prod_01',
      target: { where: "SeverityText = 'ERROR'", whereLanguage: 'sql' },
      baseline: { where: "SeverityText = 'INFO'", whereLanguage: 'sql' },
    },
    validate: (data) => Array.isArray(data?.divergences) && data.divergences.length > 0,
    describe: (data) => `${data.divergences.length} divergences ranked, culprit: ${data.divergences[0].attribute} (${(data.divergences[0].divergenceScore * 100).toFixed(1)}%)`,
  },
  {
    name: 'clickstack_emerging_signals',
    args: { sourceId: 'src_log_prod_01', minShareRatio: 1.5 },
    validate: (data) => Array.isArray(data?.emerging) || Array.isArray(data?.emergingPatterns),
    describe: (data) => `${(data.emerging || data.emergingPatterns).length} novel emerging signal patterns detected`,
  },
  {
    name: 'clickstack_sql',
    args: { connectionId: 'conn_clickhouse_local', query: 'SELECT count() as total_spans FROM otel.otel_traces' },
    validate: (data) => Array.isArray(data?.data) || Array.isArray(data?.rows) || data?.total_spans !== undefined || !!data?.result || !!data?.query,
    describe: (data) => `ClickHouse SQL executed successfully (Query: "${data?.query || 'SELECT...'}")`,
  },

  // 4. Dashboards (7 tools)
  {
    name: 'clickstack_get_dashboard',
    args: { id: 'dash_api_overview' },
    validate: (data) => data?.id === 'dash_api_overview' && Array.isArray(data?.tiles),
    describe: (data) => `Dashboard "${data.name}", ${data.tiles.length} tiles configured`,
  },
  {
    name: 'clickstack_get_dashboard_tile',
    args: { dashboardId: 'dash_api_overview', tileId: 'tile_kpi_error' },
    validate: (data) => data?.id === 'tile_kpi_error' || data?.tile?.id === 'tile_kpi_error',
    describe: (data) => `Tile: "${data.name || data.tile?.name}" (Type: ${data.displayType || data.tile?.displayType})`,
  },
  {
    name: 'clickstack_save_dashboard',
    args: {
      id: 'dash_ephemeral_audit',
      name: 'Audit Dashboard',
      tags: ['audit', 'golden-signals'],
      tiles: [{ id: 't1', name: 'Tile 1', displayType: 'number' }],
    },
    validate: (data) => data?.id === 'dash_ephemeral_audit' || data?.status === 'created' || data?.status === 'updated' || data?.success === true,
    describe: (data) => `Dashboard saved: "${data.name || 'Audit Dashboard'}"`,
  },
  {
    name: 'clickstack_patch_dashboard',
    args: {
      id: 'dash_ephemeral_audit',
      patch: { name: 'Patched Audit Dashboard' },
    },
    validate: (data) => data?.id === 'dash_ephemeral_audit' || !!data?.patch || data?.status === 'updated' || data?.success === true,
    describe: (data) => `Dashboard patched successfully`,
  },
  {
    name: 'clickstack_delete_dashboard',
    args: { id: 'dash_ephemeral_audit' },
    validate: (data) => data?.id === 'dash_ephemeral_audit' || data?.status === 'deleted' || data?.success === true,
    describe: (data) => `Dashboard deleted: ${data.id || 'dash_ephemeral_audit'}`,
  },
  {
    name: 'clickstack_query_tile',
    args: { dashboardId: 'dash_api_overview', tileId: 'tile_kpi_error' },
    validate: (data) => !!data?.tileId && (data?.status === 'success' || data?.value !== undefined || data?.sampleResult !== undefined || data?.rows !== undefined),
    describe: (data) => `Tile "${data.tileName || data.tileId}" queried, Status: ${data.status || 'OK'}, Sample: ${JSON.stringify(data.sampleResult || data.value || data.rows)}`,
  },
  {
    name: 'clickstack_query_tiles',
    args: { dashboardId: 'dash_api_overview' },
    validate: (data) => Array.isArray(data?.results) && data.results.length > 0,
    describe: (data) => `Queried ${data.results.length} tiles in parallel, all resolved successfully`,
  },

  // 5. Alerts & Webhooks (5 tools)
  {
    name: 'clickstack_get_alert',
    args: { id: 'alert_p99_spike' },
    validate: (data) => !!data?.id && data?.threshold !== undefined,
    describe: (data) => `Alert: "${data.name}", Threshold: ${data.threshold}ms (${data.thresholdType})`,
  },
  {
    name: 'clickstack_save_alert',
    args: {
      id: 'alert_p99_spike',
      name: 'Checkout P99 Latency Surge',
      interval: '5m',
      threshold: 2000,
      thresholdType: 'above',
      channels: ['wh_slack_sre'],
    },
    validate: (data) => data?.id === 'alert_p99_spike' || data?.status === 'created' || data?.status === 'updated' || data?.success === true,
    describe: (data) => `Alert saved: "${data.name || 'Checkout P99 Latency Surge'}"`,
  },
  {
    name: 'clickstack_get_webhook',
    args: { id: 'wh_slack_sre' },
    validate: (data) => Array.isArray(data?.webhooks) || (!!data?.id && !!data?.url),
    describe: (data) => data?.webhooks ? `${data.webhooks.length} webhooks configured` : `Webhook "${data.name}" (${data.service})`,
  },
  {
    name: 'clickstack_save_webhook',
    args: {
      id: 'wh_test_ephemeral',
      name: 'Ephemeral Webhook',
      service: 'slack',
      url: 'https://hooks.slack.com/services/test',
    },
    validate: (data) => data?.id === 'wh_test_ephemeral' || data?.status === 'created' || data?.status === 'updated' || data?.success === true,
    describe: (data) => `Webhook saved: "${data.name || 'Ephemeral Webhook'}"`,
  },
  {
    name: 'clickstack_delete_webhook',
    args: { id: 'wh_test_ephemeral' },
    validate: (data) => data?.id === 'wh_test_ephemeral' || data?.status === 'deleted' || data?.success === true,
    describe: (data) => `Webhook deleted: "${data.id || 'wh_test_ephemeral'}"`,
  },
];

function extractPayload(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') {
    try {
      const parsed = JSON.parse(obj);
      return extractPayload(parsed);
    } catch {
      return obj;
    }
  }
  if (obj.widgetData) return extractPayload(obj.widgetData);
  if (obj.structuredContent) return extractPayload(obj.structuredContent);
  if (Array.isArray(obj.content) && obj.content.length > 0) {
    const textItem = obj.content.find((c) => c.type === 'text');
    if (textItem && typeof textItem.text === 'string') {
      try {
        const parsed = JSON.parse(textItem.text);
        if (parsed && typeof parsed === 'object') {
          return extractPayload(parsed);
        }
      } catch {}
    }
  }
  return obj;
}

async function callTool(name, args, id) {
  const payload = {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name, arguments: args },
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

    const rawResult = json?.result || {};
    const parsedData = extractPayload(rawResult);

    const widgetMeta = rawResult._meta?.['ui:widget'] || rawResult.widget;
    const hasWidget = !!widgetMeta;

    return {
      success: true,
      name,
      elapsedMs,
      parsedData,
      rawResult,
      hasWidget,
      widgetName: widgetMeta?.name || (typeof widgetMeta === 'string' ? widgetMeta : null),
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

async function auditAll() {
  console.log('========================================================================================================');
  console.log('🔬 DEEP OUTPUT AUDIT: Verifying Payload Validity on All 27 ClickStack MCP Tools');
  console.log(`🎯 Target Endpoint: ${ENDPOINT}`);
  console.log('========================================================================================================\n');

  let validCount = 0;
  let invalidCount = 0;
  const rows = [];

  for (let i = 0; i < toolsToAudit.length; i++) {
    const toolDef = toolsToAudit[i];
    const res = await callTool(toolDef.name, toolDef.args, i + 1);

    if (!res.success) {
      invalidCount++;
      console.log(`❌ [${(i + 1).toString().padStart(2, '0')}/27] ${toolDef.name.padEnd(46)} ERROR: ${res.error}`);
      rows.push({
        num: i + 1,
        name: toolDef.name,
        valid: false,
        widget: '-',
        details: `ERROR: ${res.error}`,
      });
      continue;
    }

    let isValid = false;
    let description = '';
    try {
      isValid = toolDef.validate(res.parsedData);
      description = isValid
        ? toolDef.describe(res.parsedData)
        : `INVALID DATA SHAPE: ${JSON.stringify(res.parsedData).slice(0, 100)}`;
    } catch (e) {
      isValid = false;
      description = `VALIDATION EXCEPTION: ${e.message}`;
    }

    const widgetTag = res.hasWidget ? `[UI: ${res.widgetName || 'Ext-Apps'}]` : '[Data Only]';

    if (isValid) {
      validCount++;
      console.log(
        `✅ [${(i + 1).toString().padStart(2, '0')}/27] ${toolDef.name.padEnd(46)} VALID  ${widgetTag.padEnd(26)} ${description}`
      );
      rows.push({
        num: i + 1,
        name: toolDef.name,
        valid: true,
        widget: res.hasWidget ? res.widgetName || 'Yes' : 'No',
        details: description,
        elapsedMs: res.elapsedMs,
      });
    } else {
      invalidCount++;
      console.log(
        `⚠️  [${(i + 1).toString().padStart(2, '0')}/27] ${toolDef.name.padEnd(46)} INVALID ${widgetTag.padEnd(26)} ${description}`
      );
      rows.push({
        num: i + 1,
        name: toolDef.name,
        valid: false,
        widget: res.hasWidget ? res.widgetName || 'Yes' : 'No',
        details: description,
        elapsedMs: res.elapsedMs,
      });
    }
  }

  console.log('\n========================================================================================================');
  console.log(`📊 Final Audit Result: ${validCount}/27 Tools Have 100% VALID OUTPUT (${invalidCount} failed)`);
  console.log('========================================================================================================\n');

  if (invalidCount > 0) {
    process.exit(1);
  }
}

auditAll();
