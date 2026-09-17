export interface LogPattern {
  template: string;
  sampleCount: number;
  percentage: number;
  whereSnippet: string;
  isSpam?: boolean;
  isAnomaly?: boolean;
}

export class DrainClusterer {
  maskLog(message: string): string {
    return message
      .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '<*>')
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '<*>')
      .replace(/0x[0-9a-fA-F]+/g, '<*>')
      .replace(/\b(?:usr|cart|txn|order|req|span|trace|id)_[a-zA-Z0-9_]+\b/gi, '<*>')
      .replace(/\b\d+\b/g, '<*>')
      .replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<*>');
  }

  clusterLogs(messages: string[]): LogPattern[] {
    const counts = new Map<string, number>();
    for (const msg of messages) {
      const template = this.maskLog(msg);
      counts.set(template, (counts.get(template) || 0) + 1);
    }

    const total = messages.length || 1;
    return Array.from(counts.entries())
      .map(([template, count]) => {
        const pct = (count / total) * 100;
        return {
          template,
          sampleCount: count,
          percentage: parseFloat(pct.toFixed(2)),
          whereSnippet: `Body:"${template.replace(/<\*>/g, '').trim().slice(0, 40)}"`,
          isSpam: pct > 50,
          isAnomaly: pct < 1 && count > 0,
        };
      })
      .sort((a, b) => b.sampleCount - a.sampleCount);
  }
}
