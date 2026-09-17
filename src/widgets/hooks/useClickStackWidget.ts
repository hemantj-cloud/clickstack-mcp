'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@modelcontextprotocol/ext-apps/react';

function extractPayload(raw: any) {
  if (!raw) return null;
  if (raw.widgetData) return raw.widgetData;
  if (raw.structuredContent?.widgetData) return raw.structuredContent.widgetData;
  if (raw.structuredContent) return raw.structuredContent;
  if (raw.content?.[0]?.text) {
    try {
      const parsed = JSON.parse(raw.content[0].text);
      return parsed?.widgetData || parsed?.structuredContent?.widgetData || parsed?.structuredContent || parsed;
    } catch {}
  }
  return raw;
}

function getInitialWindowData() {
  if (typeof window !== 'undefined') {
    const raw = (window as any)?.openai?.toolOutput;
    const extracted = extractPayload(raw);
    if (extracted && Object.keys(extracted).length > 0) return extracted;
  }
  return null;
}

export function useClickStackWidget<T = any>(defaultData: T) {
  const [data, setData] = useState<T>(() => {
    return (getInitialWindowData() as T) || defaultData;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initial = getInitialWindowData();
    if (initial) {
      setData(initial as T);
    }
  }, []);

  const { app, isConnected } = useApp({
    appInfo: { name: 'ClickStack-Widget', version: '2.0.0' },
    capabilities: {},
    onAppCreated: (appInstance) => {
      appInstance.ontoolresult = (result: any) => {
        const payload = extractPayload(result);
        if (payload) {
          setData(payload as T);
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

