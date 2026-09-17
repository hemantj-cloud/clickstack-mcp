import { Injectable } from '@nitrostack/core';
import { MOCK_ALERTS, MOCK_WEBHOOKS } from '../clickstack.data.js';

@Injectable()
export class AlertsService {
  private alerts = [...MOCK_ALERTS];
  private webhooks = [...MOCK_WEBHOOKS];

  async getAlert(id?: string, state?: string) {
    if (!id) {
      return {
        alerts: this.alerts
          .filter(a => !state || a.state === state)
          .map(a => ({ id: a.id, name: a.name, state: a.state, interval: a.interval })),
      };
    }
    const alert = this.alerts.find(a => a.id === id);
    if (!alert) throw new Error(`Alert '${id}' not found.`);
    return alert;
  }

  async saveAlert(alert: any) {
    const existingIndex = this.alerts.findIndex(a => a.id === alert.id);
    if (existingIndex >= 0) {
      this.alerts[existingIndex] = { ...this.alerts[existingIndex], ...alert };
      return { id: alert.id, status: 'updated' };
    } else {
      const newId = alert.id || `alert_${Date.now()}`;
      const newAlert = { ...alert, id: newId, state: 'OK' };
      this.alerts.push(newAlert);
      return { id: newId, status: 'created', alert: newAlert };
    }
  }

  async getWebhook() {
    return {
      webhooks: this.webhooks.map(w => ({ id: w.id, name: w.name, service: w.service })),
    };
  }

  async saveWebhook(webhook: any) {
    const existingIndex = this.webhooks.findIndex(w => w.id === webhook.id);
    if (existingIndex >= 0) {
      this.webhooks[existingIndex] = { ...this.webhooks[existingIndex], ...webhook };
      return { id: webhook.id, status: 'updated' };
    } else {
      const newId = webhook.id || `wh_${Date.now()}`;
      const newWebhook = { ...webhook, id: newId };
      this.webhooks.push(newWebhook);
      return { id: newId, status: 'created' };
    }
  }

  async deleteWebhook(id: string) {
    // Check if referenced by alerts
    const referenced = this.alerts.some(a => a.channels?.includes(id));
    if (referenced) {
      throw new Error(`Cannot delete webhook '${id}': active alerts are still bound to this channel.`);
    }
    const idx = this.webhooks.findIndex(w => w.id === id);
    if (idx >= 0) {
      this.webhooks.splice(idx, 1);
      return { id, status: 'deleted' };
    }
    throw new Error(`Webhook '${id}' not found.`);
  }
}
