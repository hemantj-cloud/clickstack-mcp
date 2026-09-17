import { Module } from '@nitrostack/core';
import { DashboardsService } from './dashboards.service.js';
import { DashboardsTools } from './dashboards.tools.js';

@Module({
  name: 'dashboards',
  description: 'ClickStack dashboard authoring, querying, and batch validation',
  controllers: [DashboardsTools],
  providers: [DashboardsService, DashboardsTools],
  exports: [DashboardsService],
})
export class DashboardsModule {}
