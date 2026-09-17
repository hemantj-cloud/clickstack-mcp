import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { SourcesService } from './sources.service.js';

function clickstackWidget(route: string) {
  return {
    route: route.replace(/^\//, ''),
    prefersBorder: true,
    csp: {
      resourceDomains: ['https://clickhouse.cloud', 'https://cdnjs.cloudflare.com'],
    },
  };
}

const DescribeSourceSchema = z.object({
  sourceId: z.string().describe('Source ID from clickstack_list_sources'),
});

const ListMetricsSchema = z.object({
  sourceId: z.string().describe('Metric source ID'),
  kind: z.enum(['gauge', 'sum', 'histogram', 'exponential histogram', 'summary']).optional().describe('Metric kind filter'),
  namePattern: z.string().optional().describe('Filter metric names by case-insensitive pattern'),
});

const DescribeMetricSchema = z.object({
  sourceId: z.string().describe('Metric source ID'),
  metricName: z.string().describe('Metric name to inspect'),
  kind: z.enum(['gauge', 'sum', 'histogram', 'exponential histogram', 'summary']).describe('Metric kind'),
});

const SaveSourceSchema = z.object({
  id: z.string().optional().describe('Source ID for update; omit to create new'),
  name: z.string().describe('Source display name'),
  kind: z.enum(['log', 'trace', 'metric', 'session', 'promql']),
  connection: z.string().describe('Database connection ID'),
  databaseName: z.string().describe('ClickHouse database name'),
  tableName: z.string().describe('ClickHouse table name'),
  timestampValueExpression: z.string().default('Timestamp'),
});

const DeleteSourceSchema = z.object({
  id: z.string().describe('Source ID to delete'),
});

@Injectable({ deps: [SourcesService] })
export class SourcesTools {
  constructor(private readonly sourcesService: SourcesService) {}

  @Tool({
    name: 'clickstack_list_sources',
    description: 'List all data sources (logs, metrics, traces) and database connections available to this team.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  })
  async listSources(_input: any, _ctx: ExecutionContext) {
    const data = await this.sourcesService.listSources();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_describe_source',
    description: 'CALL THIS BEFORE WRITING QUERIES. Returns the full column schema, map-attribute keys, and sampled low-cardinality values for a single data source.',
    inputSchema: DescribeSourceSchema,
    annotations: { readOnlyHint: true },
  })
  async describeSource(input: z.infer<typeof DescribeSourceSchema>, _ctx: ExecutionContext) {
    const data = await this.sourcesService.describeSource(input.sourceId);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_list_metrics',
    description: 'Paginated catalog of metric names on a metric source with optional kind and namePattern filters.',
    inputSchema: ListMetricsSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/metric-inspector'))
  async listMetrics(input: z.infer<typeof ListMetricsSchema>, _ctx: ExecutionContext) {
    const data = await this.sourcesService.listMetrics(input.sourceId, input.kind, input.namePattern);
    return {
      widgetData: data,
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_describe_metric',
    description: 'Drill-down into a specific metric to get attribute keys, sampled values, unit, and description.',
    inputSchema: DescribeMetricSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/metric-inspector'))
  async describeMetric(input: z.infer<typeof DescribeMetricSchema>, _ctx: ExecutionContext) {
    const data = await this.sourcesService.describeMetric(input.sourceId, input.metricName, input.kind);
    return {
      widgetData: data,
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_save_source',
    description: 'Create (omit id) or update (provide id) a telemetry data source so shipped telemetry becomes queryable.',
    inputSchema: SaveSourceSchema,
    annotations: { destructiveHint: true },
  })
  async saveSource(input: z.infer<typeof SaveSourceSchema>, _ctx: ExecutionContext) {
    const result = await this.sourcesService.saveSource(input);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_delete_source',
    description: 'Permanently delete a data source by ID.',
    inputSchema: DeleteSourceSchema,
    annotations: { destructiveHint: true },
  })
  async deleteSource(input: z.infer<typeof DeleteSourceSchema>, _ctx: ExecutionContext) {
    const result = await this.sourcesService.deleteSource(input.id);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
}
