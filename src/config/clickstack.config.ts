import dotenv from 'dotenv';
dotenv.config();

export interface ClickStackConfig {
  port: number;
  clickhouseUrl: string;
  clickhouseUser: string;
  clickhousePassword?: string;
  clickhouseDatabase: string;
  oauthRequired: boolean;
  resourceUri: string;
  authServerUrl: string;
  jwksUri?: string;
  scopesSupported: string[];
}

export const clickstackConfig: ClickStackConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  clickhouseUrl: process.env.CLICKHOUSE_URL || 'https://demo.clickhouse.com:8443',
  clickhouseUser: process.env.CLICKHOUSE_USER || 'demo',
  clickhousePassword: process.env.CLICKHOUSE_PASSWORD || '',
  clickhouseDatabase: process.env.CLICKHOUSE_DATABASE || 'default',
  oauthRequired: process.env.OAUTH_REQUIRED === 'true',
  resourceUri: process.env.RESOURCE_URI || 'https://mcp.clickhouse.cloud/clickstack',
  authServerUrl: process.env.AUTH_SERVER_URL || 'https://mcp.clickhouse.cloud/oauth',
  jwksUri: process.env.JWKS_URI,
  scopesSupported: (process.env.SCOPES_SUPPORTED || 'observability:read observability:write').split(' '),
};
