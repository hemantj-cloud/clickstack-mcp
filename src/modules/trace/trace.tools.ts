import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { TraceService } from './trace.service.js';

function clickstackWidget(route: string) {
  return {
    route: route.replace(/^\//, ''),
    prefersBorder: true,
    csp: {
      resourceDomains: ['https://clickhouse.cloud', 'https://cdnjs.cloudflare.com'],
    },
  };
}

const WaterfallSchema = z.object({
  sourceId: z.string().describe('Trace source ID. Call clickstack_list_sources to find sources.'),
  traceId: z.string().optional().describe('Specific TraceId. Auto-picks slowest if omitted.'),
  pickFilter: z.string().optional().default('').describe('Filter to match when auto-picking.'),
  pickBy: z.enum(['slowest', 'random']).optional().default('slowest'),
  logSourceId: z.string().optional().describe('Correlate and inline logs into span tree.'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const TopOperationsSchema = z.object({
  sourceId: z.string().describe('Trace source ID'),
  parentFilter: z.string().describe('Filter defining parent span (e.g. SpanName:"POST /api/v1/checkout")'),
  whereLanguage: z.enum(['lucene', 'sql']).optional().default('lucene'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

@Injectable({ deps: [TraceService] })
export class TraceTools {
  constructor(private readonly traceService: TraceService) {}

  @Tool({
    name: 'clickstack_trace_waterfall',
    description: 'Fetch all spans in ONE trace and return them as an interactive parent/child waterfall tree with correlated logs.',
    inputSchema: WaterfallSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/trace-waterfall'))
  async getTraceWaterfall(input: z.infer<typeof WaterfallSchema>, _ctx: ExecutionContext) {
    const data = await this.traceService.fetchTraceWaterfall(input);
    return {
      widgetData: data,
      content: [
        {
          type: 'text',
          text: `Trace ${data.traceId}: ${data.spans?.length ?? 0} spans, ${(data.durationMs ?? 0).toFixed(2)}ms duration. Interactive flamegraph widget rendered.`,
        },
      ],
    };
  }

  @Tool({
    name: 'clickstack_trace_top_time_consuming_operations',
    description: 'Breakdown child operations contributing the most cumulative latency across all traces matching parent filter.',
    inputSchema: TopOperationsSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/trace-waterfall'))
  async getTopTimeConsumingOperations(input: z.infer<typeof TopOperationsSchema>, _ctx: ExecutionContext) {
    const data = await this.traceService.fetchTopTimeConsumingOperations(input);
    return {
      widgetData: data,
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
}
