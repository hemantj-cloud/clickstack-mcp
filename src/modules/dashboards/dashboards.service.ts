import { Injectable } from '@nitrostack/core';
import { MOCK_DASHBOARDS } from '../clickstack.data.js';

@Injectable()
export class DashboardsService {
  private dashboards = [...MOCK_DASHBOARDS];

  async getDashboard(id?: string): Promise<any> {
    if (!id) {
      return {
        dashboards: this.dashboards.map(d => ({ id: d.id, name: d.name, tags: d.tags })),
      };
    }
    const dash = this.dashboards.find(d => d.id === id);
    if (!dash) throw new Error(`Dashboard '${id}' not found.`);
    return dash;
  }

  async getDashboardTile(dashboardId: string, tileId: string) {
    const dash = await this.getDashboard(dashboardId);
    const tile = dash.tiles?.find((t: any) => t.id === tileId);
    if (!tile) throw new Error(`Tile '${tileId}' not found in dashboard '${dashboardId}'.`);
    return tile;
  }

  async saveDashboard(dashboard: any) {
    const existingIndex = this.dashboards.findIndex(d => d.id === dashboard.id);
    if (existingIndex >= 0) {
      this.dashboards[existingIndex] = { ...this.dashboards[existingIndex], ...dashboard };
      return { id: dashboard.id, status: 'updated' };
    } else {
      const newId = dashboard.id || `dash_${Date.now()}`;
      const newDash = { ...dashboard, id: newId };
      this.dashboards.push(newDash);
      return { id: newId, status: 'created', dashboard: newDash };
    }
  }

  async patchDashboard(id: string, patch: any) {
    const dash = this.dashboards.find(d => d.id === id);
    if (!dash) throw new Error(`Dashboard '${id}' not found.`);

    if (patch.name) dash.name = patch.name;
    if (patch.tags) dash.tags = patch.tags;
    if (patch.tile) {
      const tileIndex = dash.tiles.findIndex((t: any) => t.id === patch.tile.id);
      if (tileIndex >= 0) {
        dash.tiles[tileIndex] = { ...dash.tiles[tileIndex], ...patch.tile };
      } else {
        dash.tiles.push(patch.tile);
      }
    }
    return { id, status: 'patched', dashboard: dash };
  }

  async deleteDashboard(id: string) {
    const idx = this.dashboards.findIndex(d => d.id === id);
    if (idx >= 0) {
      this.dashboards.splice(idx, 1);
      return { id, status: 'deleted' };
    }
    throw new Error(`Dashboard '${id}' not found.`);
  }

  async queryTile(dashboardId: string, tileId: string) {
    const tile = await this.getDashboardTile(dashboardId, tileId);
    return {
      dashboardId,
      tileId,
      tileName: tile.name,
      status: 'success',
      sampleResult: { rows: 24, status: 'healthy' },
    };
  }

  async queryTiles(dashboardId: string, tileIds?: string[]) {
    const dash = await this.getDashboard(dashboardId);
    const targetTiles = tileIds
      ? dash.tiles.filter((t: any) => tileIds.includes(t.id))
      : dash.tiles;

    return {
      dashboardId,
      totalTested: targetTiles.length,
      results: targetTiles.map((t: any) => ({
        tileId: t.id,
        tileName: t.name,
        status: 'success',
        displayType: t.displayType,
      })),
      unrunTileIds: [],
    };
  }
}
