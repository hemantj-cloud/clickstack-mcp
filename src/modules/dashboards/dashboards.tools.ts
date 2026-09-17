import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { DashboardsService } from './dashboards.service.js';

function clickstackWidget(route: string) {
  return {
    route: route.replace(/^\//, ''),
    prefersBorder: true,
    csp: {
      resourceDomains: ['https://clickhouse.cloud', 'https://cdnjs.cloudflare.com'],
    },
  };
}

const GetDashboardSchema = z.object({
  id: z.string().optional().describe('Dashboard ID. Omit to list all dashboards, provide to get full detail.'),
});

const GetDashboardTileSchema = z.object({
  dashboardId: z.string().describe('Dashboard ID'),
  tileId: z.string().describe('Tile ID within the dashboard'),
});

const SaveDashboardSchema = z.object({
  id: z.string().optional().describe('Dashboard ID. Omit to create, provide to update.'),
  name: z.string().describe('Dashboard display name'),
  tags: z.array(z.string()).optional(),
  tiles: z.array(z.any()).describe('Array of dashboard tile configurations'),
});

const PatchDashboardSchema = z.object({
  id: z.string().describe('Dashboard ID to patch'),
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  tile: z.any().optional().describe('Single tile to update/replace in place'),
});

const DeleteDashboardSchema = z.object({
  id: z.string().describe('Dashboard ID to delete'),
});

const QueryTileSchema = z.object({
  dashboardId: z.string().describe('Dashboard ID'),
  tileId: z.string().describe('Tile ID to test'),
});

const QueryTilesSchema = z.object({
  dashboardId: z.string().describe('Dashboard ID'),
  tileIds: z.array(z.string()).optional().describe('Optional subset of tile IDs to validate'),
});

@Injectable({ deps: [DashboardsService] })
export class DashboardsTools {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Tool({
    name: 'clickstack_get_dashboard',
    description: 'List all dashboards (without ID) or get full dashboard detail with all tiles (with ID).',
    inputSchema: GetDashboardSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/dashboard-canvas'))
  async getDashboard(input: z.infer<typeof GetDashboardSchema>, _ctx: ExecutionContext) {
    const data = await this.dashboardsService.getDashboard(input.id);
    return {
      widgetData: data,
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_get_dashboard_tile',
    description: 'Retrieve a single tile from a dashboard by tileId without loading the full dashboard.',
    inputSchema: GetDashboardTileSchema,
    annotations: { readOnlyHint: true },
  })
  async getDashboardTile(input: z.infer<typeof GetDashboardTileSchema>, _ctx: ExecutionContext) {
    const data = await this.dashboardsService.getDashboardTile(input.dashboardId, input.tileId);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_save_dashboard',
    description: 'Create or update a dashboard with tiles. Always run clickstack_query_tiles after saving to validate queries.',
    inputSchema: SaveDashboardSchema,
    annotations: { destructiveHint: true },
  })
  @Widget(clickstackWidget('/dashboard-canvas'))
  async saveDashboard(input: z.infer<typeof SaveDashboardSchema>, _ctx: ExecutionContext) {
    const result = await this.dashboardsService.saveDashboard(input);
    return {
      widgetData: result.dashboard,
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_patch_dashboard',
    description: 'Make targeted updates to a dashboard (name, tags, or a single tile) without resubmitting the entire dashboard.',
    inputSchema: PatchDashboardSchema,
    annotations: { destructiveHint: true },
  })
  async patchDashboard(input: z.infer<typeof PatchDashboardSchema>, _ctx: ExecutionContext) {
    const result = await this.dashboardsService.patchDashboard(input.id, input);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_delete_dashboard',
    description: 'Permanently delete a dashboard by ID.',
    inputSchema: DeleteDashboardSchema,
    annotations: { destructiveHint: true },
  })
  async deleteDashboard(input: z.infer<typeof DeleteDashboardSchema>, _ctx: ExecutionContext) {
    const result = await this.dashboardsService.deleteDashboard(input.id);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_query_tile',
    description: 'Execute the query for a single tile on an existing dashboard to spot-check results.',
    inputSchema: QueryTileSchema,
    annotations: { readOnlyHint: true },
  })
  async queryTile(input: z.infer<typeof QueryTileSchema>, _ctx: ExecutionContext) {
    const data = await this.dashboardsService.queryTile(input.dashboardId, input.tileId);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_query_tiles',
    description: 'Batch-validate up to 50 dashboard tiles in ONE call and return a per-tile success/failure summary. PREFER THIS after saving a dashboard.',
    inputSchema: QueryTilesSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/dashboard-canvas'))
  async queryTiles(input: z.infer<typeof QueryTilesSchema>, _ctx: ExecutionContext) {
    const data = await this.dashboardsService.queryTiles(input.dashboardId, input.tileIds);
    return {
      widgetData: data,
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
}
