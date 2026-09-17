import { Module } from '@nitrostack/core';
import { PromptsService } from './prompts.service.js';

@Module({
  name: 'prompts',
  description: 'ClickStack MCP Prompts for AI agent steering and dashboard authoring',
  controllers: [PromptsService],
  providers: [PromptsService],
  exports: [PromptsService],
})
export class PromptsModule {}
