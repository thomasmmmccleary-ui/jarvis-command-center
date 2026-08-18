import sys

with open('components/OfficeScene.tsx', 'r') as f:\n    content = f.read()\n\nold = """            <div style={{ padding: '12px 14px' }}>
              <OfficeFloor agents={agents} activeAgents={activeAgents} />
            </div>"""

new = """            {/* 3D / 2D Toggle button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 14px 0' }}>
              <button
                onClick={() => setUse3D(v => !v)}
                style={{
                  background: use3D ? 'linear-gradient(135deg, rgba(0,245,255,0.18), rgba(124,58,237,0.18))' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${use3D ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8,
                  color: use3D ? '#00f5ff' : 'rgba(148,163,184,0.5)',
                  fontSize: 9,
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: 1,
                  padding: '5px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: use3D ? '0 0 12px rgba(0,245,255,0.2)' : 'none',
                }}
              >
                <span>{use3D ? '\\u25C6' : '\\u25C7'}</span>
                {use3D ? '3D MODE \\u2014 WebGL' : '2D MODE \\u2014 CSS'}
              </button>
            </div>
            <div style={{ padding: '12px 14px', height: 700 }}>
              {use3D ? (
                <Office3DScene
                  agents={agents}
                  activeAgents={activeAgents}
                  style={{ height: '100%', borderRadius: 10, overflow: 'hidden' }}
                />
              ) : (
                <OfficeFloor agents={agents} activeAgents={activeAgents} />
              )}
            </div>"""

if old in content:
    content = content.replace(old, new)
    with open('components/OfficeScene.tsx', 'w') as f:\n        f.write(content)\n    print("SUCCESS: replaced OfficeFloor block")
else:
    print("ERROR: could not find target block")
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if 'OfficeFloor' in l:\n            print(f"  Line {i+1}: {repr(l)}")
