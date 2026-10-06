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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            background: '#2563eb',
            borderRadius: 12,
            color: '#ffffff',
            fontSize: 34,
          }}
        >
          u
        </div>
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
