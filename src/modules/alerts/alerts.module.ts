import { Module } from '@nitrostack/core';
import { AlertsService } from './alerts.service.js';
import { AlertsTools } from './alerts.tools.js';

@Module({
  name: 'alerts',
  description: 'ClickStack alerting engine and notification channels',
  controllers: [AlertsTools],
  providers: [AlertsService, AlertsTools],
  exports: [AlertsService],
})
export class AlertsModule {}
