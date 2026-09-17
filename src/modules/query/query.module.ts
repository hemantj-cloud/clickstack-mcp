import { Module } from '@nitrostack/core';
import { QueryService } from './query.service.js';
import { QueryTools } from './query.tools.js';
import { ClickHousePoolService } from '../../services/clickhouse-pool.service.js';

@Module({
  name: 'query',
  description: 'ClickStack high-level query builder, pattern mining, and SQL execution',
  controllers: [QueryTools],
  providers: [ClickHousePoolService, QueryService, QueryTools],
  exports: [QueryService],
})
export class QueryModule {}
