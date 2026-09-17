import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { QueryService } from './query.service.js';

function clickstackWidget(route: string) {
  return {
    route: route.replace(/^\//, ''),
    prefersBorder: true,
    csp: {
      resourceDomains: ['https://clickhouse.cloud', 'https://cdnjs.cloudflare.com'],
    },
  };
}

const SelectItemSchema = z.object({
  aggFn: z.enum(['avg', 'count', 'count_distinct', 'last_value', 'max', 'min', 'quantile', 'sum', 'increase', 'none']),
  valueExpression: z.string().optional().describe('Column expression (e.g. Duration / 1e6)'),
  alias: z.string().optional().describe('Display label in legend or table header'),
  where: z.string().optional().describe('Per-series conditional filter (compiles to <aggFn>If)'),
  whereLanguage: z.enum(['lucene', 'sql']).optional().default('lucene'),
  level: z.enum(['0.5', '0.9', '0.95', '0.99']).optional().describe('Percentile level for quantile'),
  metricType: z.enum(['gauge', 'sum', 'histogram', 'exponential histogram']).optional(),
  metricName: z.string().optional(),
  isDelta: z.boolean().optional(),
});

const TimeseriesSchema = z.object({
  sourceId: z.string().describe('Source ID from clickstack_list_sources'),
  select: z.array(SelectItemSchema).optional().default([]).describe('Plotted metric series'),
  where: z.string().optional().default('').describe('Global filter applied to all series'),
  whereLanguage: z.enum(['lucene', 'sql']).optional().default('lucene'),
  groupBy: z.string().optional().describe('Split series by comma-delimited columns (e.g. ServiceName, StatusCode)'),
  granularity: z.string().optional().describe('Bucket interval (e.g. 1m, 5m, 1h)'),
  displayType: z.enum(['line', 'stacked_bar']).optional().default('line'),
  startTime: z.string().optional().describe('ISO 8601 start window'),
  endTime: z.string().optional().describe('ISO 8601 end window'),
});

const TableSchema = z.object({
  sourceId: z.string().describe('Source ID'),
  select: z.array(SelectItemSchema).optional().default([]),
  where: z.string().optional().default(''),
  whereLanguage: z.enum(['lucene', 'sql']).optional().default('lucene'),
  groupBy: z.string().optional().describe('Group-by columns or ClickHouse expressions'),
  orderBy: z.string().optional().describe('Sort expression'),
  limit: z.number().optional().default(100),
  shape: z.enum(['table', 'number', 'pie', 'bar']).optional().default('table'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const SearchSchema = z.object({
  sourceId: z.string().describe('Source ID'),
  where: z.string().optional().default(''),
  whereLanguage: z.enum(['lucene', 'sql']).optional().default('lucene'),
  denoise: z.boolean().optional().default(false).describe('Filter out high-frequency repetitive log templates'),
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0),
  orderBy: z.string().optional().default('Timestamp DESC'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const EventPatternsSchema = z.object({
  sourceId: z.string().describe('Source ID'),
  where: z.string().optional().default(''),
  whereLanguage: z.enum(['lucene', 'sql']).optional().default('lucene'),
  sampleSize: z.number().optional().default(20000),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const CohortFilterSchema = z.union([
  z.string().describe('Filter expression string (e.g. SeverityText:ERROR or Duration >= 1500)'),
  z.object({
    where: z.string().describe('Filter expression'),
    whereLanguage: z.enum(['lucene', 'sql']).optional().default('lucene'),
  }),
]);

const EventDeltasSchema = z.object({
  sourceId: z.string().describe('Source ID'),
  target: CohortFilterSchema.describe('Target cohort filter expression or object (e.g. SeverityText:ERROR)'),
  baseline: CohortFilterSchema.describe('Baseline cohort filter expression or object (e.g. SeverityText:INFO)'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const EmergingSignalsSchema = z.object({
  sourceId: z.string().describe('Source ID'),
  baselineStartTime: z.string().optional().describe('ISO 8601 baseline start window'),
  baselineEndTime: z.string().optional().describe('ISO 8601 baseline end window'),
  currentStartTime: z.string().optional().describe('ISO 8601 current start window'),
  currentEndTime: z.string().optional().describe('ISO 8601 current end window'),
  where: z.string().optional().default('').describe('Optional filter expression'),
  whereLanguage: z.enum(['lucene', 'sql']).optional().default('lucene'),
  minShareRatio: z.number().optional().default(1.5).describe('Minimum multiplier to qualify as emerging signal'),
});

const SqlSchema = z.object({
  connectionId: z.string().describe('Connection ID from clickstack_list_sources'),
  query: z.string().describe('Raw ClickHouse SQL query statement'),
});

@Injectable({ deps: [QueryService] })
export class QueryTools {
  constructor(private readonly queryService: QueryService) {}

  @Tool({
    name: 'clickstack_timeseries',
    description: 'Plot metrics over time as an interactive line or stacked bar chart. PREFER THIS over raw SQL.',
    inputSchema: TimeseriesSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/timeseries-chart'))
  async timeseries(input: z.infer<typeof TimeseriesSchema>, _ctx: ExecutionContext) {
    const data = await this.queryService.timeseries(input);
    return {
      widgetData: data,
      content: [{ type: 'text', text: `Timeseries query generated ${data.series.length} series across ${data.granularity} buckets. Interactive chart rendered.` }],
    };
  }

  @Tool({
    name: 'clickstack_table',
    description: 'Compute aggregated metrics as a table, single number (KPI), pie chart, or bar chart. PREFER THIS over raw SQL.',
    inputSchema: TableSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/timeseries-chart'))
  async table(input: z.infer<typeof TableSchema>, _ctx: ExecutionContext) {
    const data = await this.queryService.table(input);
    return {
      widgetData: data,
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_search',
    description: 'Browse individual raw log, event, or trace rows. Set denoise=true to filter repetitive message spam.',
    inputSchema: SearchSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/log-patterns'))
  async search(input: z.infer<typeof SearchSchema>, _ctx: ExecutionContext) {
    const data = await this.queryService.search(input);
    return {
      widgetData: data,
      content: [{ type: 'text', text: `Found ${data.totalCount} events (Denoise: ${data.denoised}). Interactive stream rendered.` }],
    };
  }

  @Tool({
    name: 'clickstack_event_patterns',
    description: 'Discover the most common log messages and recurring event templates using Drain clustering. PREFER THIS over raw search.',
    inputSchema: EventPatternsSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/log-patterns'))
  async eventPatterns(input: z.infer<typeof EventPatternsSchema>, _ctx: ExecutionContext) {
    const data = await this.queryService.eventPatterns(input);
    return {
      widgetData: data,
      content: [{ type: 'text', text: `Discovered ${data.totalPatterns} log message templates via Drain clustering.` }],
    };
  }

  @Tool({
    name: 'clickstack_event_deltas',
    description: 'Compare two row groups (e.g. slow vs fast, errors vs healthy) and rank attributes by distribution divergence. ONE-SHOT ROOT CAUSE TRIAGE.',
    inputSchema: EventDeltasSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/event-deltas'))
  async eventDeltas(input: z.infer<typeof EventDeltasSchema>, _ctx: ExecutionContext) {
    const data = await this.queryService.eventDeltas(input);
    return {
      widgetData: data,
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_emerging_signals',
    description: 'Detect what is NEW or GONE between a baseline window and current window (two-window Drain novelty diff). Ideal for canary/deploy diffs.',
    inputSchema: EmergingSignalsSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/log-patterns'))
  async emergingSignals(input: z.infer<typeof EmergingSignalsSchema>, _ctx: ExecutionContext) {
    const data = await this.queryService.emergingSignals(input);
    return {
      widgetData: data,
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_sql',
    description: 'Execute raw ClickHouse SQL. LAST RESORT ONLY — strictly for JOINs, CTEs, window functions, or summary metrics.',
    inputSchema: SqlSchema,
    annotations: { readOnlyHint: true },
  })
  async sql(input: z.infer<typeof SqlSchema>, _ctx: ExecutionContext) {
    const data = await this.queryService.sql(input.connectionId, input.query);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
}
