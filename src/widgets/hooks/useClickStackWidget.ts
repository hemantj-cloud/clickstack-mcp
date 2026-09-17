'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@modelcontextprotocol/ext-apps/react';

export function useClickStackWidget<T = any>(defaultData: T) {
  const [data, setData] = useState<T>(defaultData);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { app, isConnected } = useApp({
    appInfo: { name: 'ClickStack-Widget', version: '2.0.0' },
    capabilities: {},
    onAppCreated: (appInstance) => {
      appInstance.ontoolresult = (result: any) => {
        if (result?.widgetData) {
          setData(result.widgetData);
        } else if (result?.structuredContent) {
          setData(result.structuredContent);
        } else if (result?.content?.[0]?.text) {
          try {
            const parsed = JSON.parse(result.content[0].text);
            setData(parsed);
          } catch {}
        }
      };
    },
  });

  const callTool = async (name: string, args: Record<string, any> = {}) => {
    if (app && isConnected) {
      try {
        return await app.callServerTool({ name, arguments: args });
      } catch (err) {
        console.error(`[ClickStack MCP] Error calling tool ${name}:`, err);
      }
    } else {
      console.log(`[ClickStack Mock Call] Tool: ${name}`, args);
    }
  };

  return {
    data,
    setData,
    isConnected,
    callTool,
    mounted,
  };
}
