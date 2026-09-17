import { Module } from '@nitrostack/core';
import { SourcesService } from './sources.service.js';
import { SourcesTools } from './sources.tools.js';
import { ClickHousePoolService } from '../../services/clickhouse-pool.service.js';

@Module({
  name: 'sources',
  description: 'ClickStack telemetry data source and connection catalog',
  controllers: [SourcesTools],
  providers: [ClickHousePoolService, SourcesService, SourcesTools],
  exports: [SourcesService],
})
export class SourcesModule {}
