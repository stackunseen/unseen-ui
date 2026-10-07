import { ImageResponse } from 'next/og';
export const dynamic = 'force-static';
export function GET() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 80px',
        background: '#fafafa',
        color: '#18181b',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <svg viewBox="0 0 100 100" width="56" height="56">
          <path d="M22 0h16q6 0 6 6v32q0 6-6 6H6q-6 0-6-6V22A22 22 0 0 1 22 0Z" fill="#1f2328" />
          <circle cx="78" cy="22" r="22" fill="#2563eb" />
          <path d="M6 56h32q6 0 6 6v32q0 6-6 6H22A22 22 0 0 1 0 78V62q0-6 6-6Z" fill="#d4d7dd" />
          <path d="M62 56h16a22 22 0 0 1 22 22v16q0 6-6 6H62q-6 0-6-6V62q0-6 6-6Z" fill="#1f2328" />
        </svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 32 }}>Unseen UI</span>
          <span style={{ color: '#52525b', fontSize: 24 }}>by Stack Unseen</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 68,
            letterSpacing: -3,
            lineHeight: 1.15,
          }}
        >
          <span>The whole interface.</span>
          <span>One shared language.</span>
        </div>
        <span style={{ fontSize: 26, color: '#52525b' }}>
          React components for applications and AI workflows.
        </span>
      </div>
      <span style={{ fontSize: 22, color: '#52525b' }}>
        Live examples · Controlled APIs · Scoped themes
      </span>
    </div>,
    { width: 1200, height: 630 },
  );
}
