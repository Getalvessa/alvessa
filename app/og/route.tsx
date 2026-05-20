import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#09090b',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0 100px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand name */}
        <div
          style={{
            display: 'flex',
            fontSize: '92px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-4px',
            lineHeight: '1',
          }}
        >
          Zenzo
        </div>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            width: '56px',
            height: '3px',
            background: 'rgba(255,255,255,0.2)',
            margin: '32px 0 24px',
          }}
        />

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: '28px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: '1.45',
            maxWidth: '640px',
          }}
        >
          Premium massage aan huis in Utrecht
        </div>

        {/* Location pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '40px',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '100px',
            padding: '8px 22px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '17px',
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.3px',
            }}
          >
            Utrecht · Nederland
          </div>
        </div>

        {/* URL — bottom right */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: '52px',
            right: '100px',
            fontSize: '17px',
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.5px',
          }}
        >
          zenzo.nl
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
