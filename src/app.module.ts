import { McpApp, Module, ConfigModule, OAuthModule } from '@nitrostack/core';
import { SourcesModule } from './modules/sources/sources.module.js';
import { QueryModule } from './modules/query/query.module.js';
import { TraceModule } from './modules/trace/trace.module.js';
import { DashboardsModule } from './modules/dashboards/dashboards.module.js';
import { AlertsModule } from './modules/alerts/alerts.module.js';
import { PromptsModule } from './modules/prompts/prompts.module.js';
import { ResourcesModule } from './modules/resources/resources.module.js';
import { OAuthGuard } from './guards/oauth.guard.js';
import { clickstackConfig } from './config/clickstack.config.js';

/**
 * ClickStack Observability MCP Server
 * Powered by NitroStack SDK Stateless with Interactive Widgets, Prompts, and Resources.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'clickstack-observability',
    version: '2.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'clickstack',
  description: 'Enterprise ClickStack Observability MCP Server with Interactive Widgets',
  imports: [
    ConfigModule.forRoot(),
    ...(clickstackConfig.oauthRequired
      ? [
          OAuthModule.forRoot({
            required: true,
            resourceUri: clickstackConfig.resourceUri,
            authorizationServers: [clickstackConfig.authServerUrl],
            scopesSupported: clickstackConfig.scopesSupported,
          }),
        ]
      : []),
    SourcesModule,
    QueryModule,
    TraceModule,
    DashboardsModule,
    AlertsModule,
    PromptsModule,
    ResourcesModule,
  ],
  providers: [OAuthGuard],
})
export class AppModule {}
