import { Module } from '@nitrostack/core';
import { ResourcesService } from './resources.service.js';
import { SourcesModule } from '../sources/sources.module.js';

@Module({
  name: 'resources',
  description: 'ClickStack MCP Resources for telemetry catalog discovery',
  imports: [SourcesModule],
  controllers: [ResourcesService],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
