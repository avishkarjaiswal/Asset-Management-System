import React from 'react'

export default function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)',
      gap: 20, zIndex: 9999,
    }}>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes rotate { to { transform: rotate(360deg); } }
        .loading-spinner {
          width: 52px; height: 52px;
          border-radius: 50%;
          border: 3px solid var(--border-subtle);
          border-top-color: var(--brand-primary);
          animation: rotate 0.8s linear infinite;
        }
        .loading-ring {
          position: absolute;
          width: 52px; height: 52px;
          border-radius: 50%;
          border: 2px solid var(--brand-primary);
          opacity: 0.3;
          animation: pulse-ring 1.5s ease-out infinite;
        }
      `}</style>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-ring" />
        <div className="loading-spinner" />
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-heading)', textAlign: 'center' }}>GPPL</div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>Asset Management System</div>
      </div>
    </div>
  )
}
