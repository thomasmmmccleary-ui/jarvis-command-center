'use client'

import dynamic from 'next/dynamic'

// Load the Sims-style office scene (client-only, heavy animations)
const OfficeScene = dynamic(() => import('@/components/OfficeScene'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: 4,
          color: '#06b6d4',
          textShadow: '0 0 20px #06b6d4',
          fontFamily: 'monospace',
        }}
      >
        J.A.R.V.I.S.
      </div>
      <div style={{ fontSize: 10, color: '#374151', letterSpacing: 2, fontFamily: 'monospace' }}>
        INITIALIZING COMMAND CENTER…
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#06b6d4',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    </div>
  ),
})

export default function Home() {
  return <OfficeScene />
}
