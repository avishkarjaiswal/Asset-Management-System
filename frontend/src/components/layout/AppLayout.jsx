import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
            zIndex: 250, backdropFilter: 'blur(2px)'
          }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          onToggleSidebar={() => setSidebarCollapsed(c => !c)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
