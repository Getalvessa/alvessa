import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Alvessa brand colors extracted from logo
// Navy: #1b2856  Gold: #C9A84C

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#1b2856',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0 104px',
          fontFamily: 'Georgia, serif',
          position: 'relative',
        }}
      >
        {/* Gold glow — top-right, mimics logo sparkle */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 65%)',
          }}
        />

        {/* Brand name + sparkle row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '96px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: '1',
            }}
          >
            Alvessa
          </div>
          {/* Sparkle — references logo star element */}
          <div
            style={{
              display: 'flex',
              fontSize: '40px',
              color: '#C9A84C',
              marginTop: '-16px',
            }}
          >
            ✦
          </div>
        </div>

        {/* Gold divider — references logo swoosh */}
        <div
          style={{
            display: 'flex',
            width: '72px',
            height: '3px',
            background: '#C9A84C',
            margin: '28px 0 24px',
            borderRadius: '2px',
          }}
        />

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: '27px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.62)',
            lineHeight: '1.5',
            maxWidth: '620px',
            letterSpacing: '0.2px',
          }}
        >
          Trusted Services at Home · Utrecht
        </div>

        {/* Location pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '40px',
            border: '1px solid rgba(201,168,76,0.35)',
            borderRadius: '100px',
            padding: '8px 24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '16px',
              color: 'rgba(201,168,76,0.75)',
              letterSpacing: '1.2px',
              fontFamily: 'sans-serif',
            }}
          >
            UTRECHT · NEDERLAND
          </div>
        </div>

        {/* Domain — bottom right */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: '52px',
            right: '104px',
            fontSize: '16px',
            color: 'rgba(255,255,255,0.22)',
            letterSpacing: '0.8px',
            fontFamily: 'sans-serif',
          }}
        >
          alvessa.nl
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
