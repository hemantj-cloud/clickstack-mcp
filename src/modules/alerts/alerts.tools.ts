import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { AlertsService } from './alerts.service.js';

function clickstackWidget(route: string) {
  return {
    route: route.replace(/^\//, ''),
    prefersBorder: true,
    csp: {
      resourceDomains: ['https://clickhouse.cloud', 'https://cdnjs.cloudflare.com'],
    },
  };
}

const GetAlertSchema = z.object({
  id: z.string().optional().describe('Alert ID. Omit to list, provide to get full details.'),
  state: z.enum(['ALERT', 'OK', 'DISABLED', 'INSUFFICIENT_DATA']).optional(),
});

const SaveAlertSchema = z.object({
  id: z.string().optional().describe('Alert ID. Omit to create, provide to update.'),
  name: z.string().describe('Alert name'),
  interval: z.enum(['1m', '5m', '15m', '30m', '1h', '6h', '12h', '1d']),
  thresholdType: z.enum(['above', 'below', 'outside', 'within']),
  threshold: z.number().describe('Numeric threshold to fire on'),
  channels: z.array(z.string()).min(1).describe('Webhook channel IDs to notify'),
});

const SaveWebhookSchema = z.object({
  id: z.string().optional(),
  name: z.string().describe('Webhook display name'),
  service: z.enum(['slack', 'generic', 'incidentio']),
  url: z.string().describe('Target webhook URL'),
});

const DeleteWebhookSchema = z.object({
  id: z.string().describe('Webhook ID to delete'),
});

@Injectable({ deps: [AlertsService] })
export class AlertsTools {
  constructor(private readonly alertsService: AlertsService) {}

  @Tool({
    name: 'clickstack_get_alert',
    description: 'List alerts (summary) or get full alert detail with evaluation history.',
    inputSchema: GetAlertSchema,
    annotations: { readOnlyHint: true },
  })
  @Widget(clickstackWidget('/alert-studio'))
  async getAlert(input: z.infer<typeof GetAlertSchema>, _ctx: ExecutionContext) {
    const data = await this.alertsService.getAlert(input.id, input.state);
    return {
      widgetData: data,
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_save_alert',
    description: 'Create or update an automated alert monitor with threshold and webhook notification routing.',
    inputSchema: SaveAlertSchema,
    annotations: { destructiveHint: true },
  })
  @Widget(clickstackWidget('/alert-studio'))
  async saveAlert(input: z.infer<typeof SaveAlertSchema>, _ctx: ExecutionContext) {
    const result = await this.alertsService.saveAlert(input);
    return {
      widgetData: result.alert,
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_get_webhook',
    description: 'List available webhook destinations (Slack, Generic, Incident.io) for alert notifications.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  })
  async getWebhook(_input: any, _ctx: ExecutionContext) {
    const data = await this.alertsService.getWebhook();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_save_webhook',
    description: 'Create or update a webhook notification destination.',
    inputSchema: SaveWebhookSchema,
    annotations: { destructiveHint: true },
  })
  async saveWebhook(input: z.infer<typeof SaveWebhookSchema>, _ctx: ExecutionContext) {
    const result = await this.alertsService.saveWebhook(input);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  @Tool({
    name: 'clickstack_delete_webhook',
    description: 'Permanently delete a webhook by ID (fails if active alerts still reference it).',
    inputSchema: DeleteWebhookSchema,
    annotations: { destructiveHint: true },
  })
  async deleteWebhook(input: z.infer<typeof DeleteWebhookSchema>, _ctx: ExecutionContext) {
    const result = await this.alertsService.deleteWebhook(input.id);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
}
