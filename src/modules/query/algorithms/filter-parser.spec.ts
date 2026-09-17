import { describe, it, expect } from 'vitest';
import { parseWhereClause } from './filter-parser.js';

describe('parseWhereClause', () => {
  it('handles empty or null inputs', () => {
    expect(parseWhereClause('').sqlWhere).toBe('');
    expect(parseWhereClause(undefined).sqlWhere).toBe('');
  });

  it('translates simple Lucene field:value pairs into SQL', () => {
    const result = parseWhereClause('ServiceName:checkout-service');
    expect(result.sqlWhere).toBe("ServiceName = 'checkout-service'");
    expect(result.extracted.serviceName).toBe('checkout-service');
  });

  it('extracts metricName and severity regardless of syntax', () => {
    const result1 = parseWhereClause('MetricName:system.cpu.utilization AND level:error');
    expect(result1.extracted.metricName).toBe('system.cpu.utilization');
    expect(result1.extracted.severity).toBe('ERROR');
    expect(result1.sqlWhere).toContain("SeverityText = 'ERROR'");

    const result2 = parseWhereClause("MetricName = 'system.memory.usage'", 'sql');
    expect(result2.extracted.metricName).toBe('system.memory.usage');
  });

  it('routes dot-separated attributes to SpanAttributes map', () => {
    const result = parseWhereClause('http.status_code:500 AND db.system:postgresql');
    expect(result.sqlWhere).toContain("SpanAttributes['http.status_code'] = '500'");
    expect(result.sqlWhere).toContain("SpanAttributes['db.system'] = 'postgresql'");
  });

  it('supports Lucene comparison operators like Duration:>1000000', () => {
    const result = parseWhereClause('ServiceName:api AND Duration:>1000000');
    expect(result.sqlWhere).toContain('Duration > 1000000');
  });

  it('preserves raw SQL expressions when whereLanguage is sql', () => {
    const rawSql = "ParentSpanId = '' AND StatusCode = 'error'";
    const result = parseWhereClause(rawSql, 'sql');
    expect(result.sqlWhere).toBe(rawSql);
  });
});
