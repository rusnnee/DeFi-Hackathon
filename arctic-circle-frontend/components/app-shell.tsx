'use client'

import { ArcticSidebar, ArcticTopBar } from './arctic-header'
import { ArcticToastProvider } from './arctic-toast'

function AppShellInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ArcticSidebar agentOnline={true} />
      <div className="ml-[200px] flex min-h-screen flex-col">
        <ArcticTopBar />
        <main className="flex-1">{children}</main>
      </div>
    </>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ArcticToastProvider>
      <AppShellInner>{children}</AppShellInner>
    </ArcticToastProvider>
  )
}
