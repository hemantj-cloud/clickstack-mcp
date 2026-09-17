/**
 * Lightweight Lucene-to-SQL Filter Parser for ClickStack Observability.
 * Translates common Lucene filter patterns into ClickHouse SQL where clauses
 * and extracts key dimensions (metricName, severity, serviceName, spanName).
 */

export interface ParsedFilter {
  sqlWhere: string;
  extracted: {
    metricName?: string;
    severity?: string;
    serviceName?: string;
    spanName?: string;
    traceId?: string;
  };
}

// Well-known OpenTelemetry attributes that live inside SpanAttributes or ResourceAttributes maps
const ATTRIBUTE_MAP_PREFIXES = [
  'http.', 'db.', 'rpc.', 'messaging.', 'net.', 'k8s.', 'container.',
  'service.', 'host.', 'process.', 'telemetry.', 'exception.', 'error.',
];

export function parseWhereClause(
  where: string | undefined | null,
  whereLanguage: 'lucene' | 'sql' = 'lucene',
  targetDomain: 'logs' | 'traces' | 'metrics' | 'auto' = 'auto'
): ParsedFilter {
  const extracted: ParsedFilter['extracted'] = {};
  if (!where || !where.trim()) {
    return { sqlWhere: '', extracted };
  }

  const trimmed = where.trim();

  // Extract metric name if present in either syntax
  const metricMatch =
    trimmed.match(/MetricName\s*[:=]\s*['"]?([a-zA-Z0-9_.-]+)['"]?/i) ||
    trimmed.match(/metric\s*[:=]\s*['"]?([a-zA-Z0-9_.-]+)['"]?/i);
  if (metricMatch) {
    extracted.metricName = metricMatch[1];
  }

  // Extract severity if present
  const severityMatch =
    trimmed.match(/SeverityText\s*[:=]\s*['"]?([a-zA-Z]+)['"]?/i) ||
    trimmed.match(/level\s*[:=]\s*['"]?([a-zA-Z]+)['"]?/i) ||
    trimmed.match(/severity\s*[:=]\s*['"]?([a-zA-Z]+)['"]?/i);
  if (severityMatch) {
    extracted.severity = severityMatch[1].toUpperCase();
  }

  // Extract service name
  const serviceMatch =
    trimmed.match(/ServiceName\s*[:=]\s*['"]?([a-zA-Z0-9_.-]+)['"]?/i) ||
    trimmed.match(/service\s*[:=]\s*['"]?([a-zA-Z0-9_.-]+)['"]?/i);
  if (serviceMatch) {
    extracted.serviceName = serviceMatch[1];
  }

  // Extract span name
  const spanMatch =
    trimmed.match(/SpanName\s*[:=]\s*['"]?([^'"]+)['"]?/i) ||
    trimmed.match(/span\s*[:=]\s*['"]?([^'"]+)['"]?/i);
  if (spanMatch) {
    extracted.spanName = spanMatch[1];
  }

  // Extract trace ID
  const traceMatch =
    trimmed.match(/TraceId\s*[:=]\s*['"]?([a-fA-F0-9]+)['"]?/i) ||
    trimmed.match(/trace_id\s*[:=]\s*['"]?([a-fA-F0-9]+)['"]?/i);
  if (traceMatch) {
    extracted.traceId = traceMatch[1];
  }

  // If already SQL syntax, return as-is (with basic sanitization)
  if (whereLanguage === 'sql' || isSqlExpression(trimmed)) {
    return { sqlWhere: trimmed, extracted };
  }

  // Translate basic Lucene tokens:
  // e.g. "ServiceName:checkout-service AND http.status_code:500 AND Duration:>1000000"
  const tokens = splitLuceneTokens(trimmed);
  const sqlParts: string[] = [];

  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (upper === 'AND' || upper === 'OR' || upper === 'NOT') {
      sqlParts.push(upper);
      continue;
    }

    const colonIndex = token.indexOf(':');
    if (colonIndex > 0) {
      const rawKey = token.substring(0, colonIndex).trim();
      const rawValue = token.substring(colonIndex + 1).trim();

      // Normalize key (map attributes vs top-level columns)
      const sqlKey = mapKeyToSqlColumn(rawKey);

      // Handle comparison operators in Lucene e.g. Duration:>1000000 or count:>=5
      const compMatch = rawValue.match(/^([><]=?)(.*)$/);
      if (compMatch) {
        const op = compMatch[1];
        const val = compMatch[2].replace(/^['"]|['"]$/g, '');
        sqlParts.push(`${sqlKey} ${op} ${val}`);
      } else {
        // Exact value or quoted phrase
        const cleanVal = rawValue.replace(/^['"]|['"]$/g, '');
        // Always uppercase SeverityText for ClickHouse OTel standard (e.g. level:error -> SeverityText = 'ERROR')
        if (sqlKey === 'SeverityText') {
          sqlParts.push(`SeverityText = '${escapeSqlString(cleanVal.toUpperCase())}'`);
        } else if (cleanVal.includes('*')) {
          const likeVal = cleanVal.replace(/\*/g, '%');
          sqlParts.push(`${sqlKey} LIKE '${escapeSqlString(likeVal)}'`);
        } else {
          sqlParts.push(`${sqlKey} = '${escapeSqlString(cleanVal)}'`);
        }
      }
    } else {
      // Free-text keyword search -> matches Body for logs or SpanName for traces
      const cleanWord = token.replace(/^['"]|['"]$/g, '');
      if (cleanWord) {
        if (targetDomain === 'traces') {
          sqlParts.push(`SpanName LIKE '%${escapeSqlString(cleanWord)}%'`);
        } else {
          sqlParts.push(`Body LIKE '%${escapeSqlString(cleanWord)}%'`);
        }
      }
    }
  }

  return {
    sqlWhere: sqlParts.join(' '),
    extracted,
  };
}

function isSqlExpression(str: string): boolean {
  return /(=|!=|<>|>=|<=| LIKE | IN | ILIKE )/i.test(str) && !str.includes(':');
}

function mapKeyToSqlColumn(key: string): string {
  const lower = key.toLowerCase();
  if (lower === 'service' || lower === 'servicename') return 'ServiceName';
  if (lower === 'span' || lower === 'spanname') return 'SpanName';
  if (lower === 'traceid' || lower === 'trace_id') return 'TraceId';
  if (lower === 'spanid' || lower === 'span_id') return 'SpanId';
  if (lower === 'duration') return 'Duration';
  if (lower === 'metricname' || lower === 'metric') return 'MetricName';
  if (lower === 'severitytext' || lower === 'level' || lower === 'severity') return 'SeverityText';
  if (lower === 'body' || lower === 'message') return 'Body';

  // If attribute begins with well-known prefix or contains a dot, route to SpanAttributes map
  if (ATTRIBUTE_MAP_PREFIXES.some((p) => key.startsWith(p)) || key.includes('.')) {
    return `SpanAttributes['${escapeSqlString(key)}']`;
  }

  return key;
}

function splitLuceneTokens(query: string): string[] {
  const result: string[] = [];
  const regex = /(".*?"|'.*?'|\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(query)) !== null) {
    result.push(match[1]);
  }
  return result;
}

function escapeSqlString(str: string): string {
  return str.replace(/'/g, "\\'");
}
