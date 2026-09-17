'use client';

import React from 'react';
import { WidgetLayout } from '@nitrostack/widgets';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <WidgetLayout>{children}</WidgetLayout>
      </body>
    </html>
  );
}
