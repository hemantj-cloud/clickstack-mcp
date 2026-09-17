import { Module } from '@nitrostack/core';
import { TraceService } from './trace.service.js';
import { TraceTools } from './trace.tools.js';
import { ClickHousePoolService } from '../../services/clickhouse-pool.service.js';

@Module({
  name: 'trace',
  description: 'ClickStack distributed tracing and flamegraph waterfall analysis',
  controllers: [TraceTools],
  providers: [ClickHousePoolService, TraceService, TraceTools],
  exports: [TraceService],
})
export class TraceModule {}
