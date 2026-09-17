import { describe, it, expect } from 'vitest';
import { DrainClusterer } from './drain.js';

describe('DrainClusterer', () => {
  const clusterer = new DrainClusterer();

  it('masks IP addresses and numbers with wildcards', () => {
    const raw = 'HealthCheck ping received from IP 192.168.1.50, status: 200 OK';
    const masked = clusterer.maskLog(raw);
    expect(masked).toBe('HealthCheck ping received from IP <*>, status: <*> OK');
  });

  it('masks UUIDs and quoted strings', () => {
    const raw = 'User 7b3f9104-e1a8-9c2f-a394-bc21890e44b1 requested "orders" from 0x7fa';
    const masked = clusterer.maskLog(raw);
    expect(masked).toContain('<*>');
    expect(masked).not.toContain('7b3f9104');
  });

  it('clusters similar logs and calculates percentages', () => {
    const logs = [
      'Failed connecting to host 10.0.0.1: connection refused',
      'Failed connecting to host 10.0.0.2: connection refused',
      'Failed connecting to host 10.0.0.3: connection refused',
      'Database query executed in 15ms',
    ];

    const patterns = clusterer.clusterLogs(logs);
    expect(patterns.length).toBe(2);
    expect(patterns[0].sampleCount).toBe(3);
    expect(patterns[0].percentage).toBe(75);
    expect(patterns[0].isSpam).toBe(true);
    expect(patterns[1].sampleCount).toBe(1);
    expect(patterns[1].percentage).toBe(25);
  });
});
