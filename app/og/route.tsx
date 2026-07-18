import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Node runtime so we can load the approved mark PNG derived from the same SVG master.
export const runtime = 'nodejs';

const BRAND_ROYAL = '#4169E1';

export async function GET() {
  const markBuffer = await readFile(
    join(process.cwd(), 'public/brand/alvessa-mark.png'),
  );
  const markSrc = `data:image/png;base64,${markBuffer.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0B1020',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0 104px',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: '-120px',
            right: '-80px',
            width: '480px',
            height: '480px',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(65,105,225,0.28) 0%, transparent 65%)`,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={markSrc}
            width={120}
            height={120}
            alt=""
            style={{ width: 120, height: 120 }}
          />
          <div
            style={{
              display: 'flex',
              fontSize: '88px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: '1',
            }}
          >
            Alvessa
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            width: '72px',
            height: '3px',
            background: BRAND_ROYAL,
            margin: '28px 0 24px',
            borderRadius: '2px',
          }}
        />

        <div
          style={{
            display: 'flex',
            fontSize: '26px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.62)',
            lineHeight: '1.5',
            letterSpacing: '0.2px',
          }}
        >
          Home services marketplace
        </div>

        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: '52px',
            right: '104px',
            fontSize: '16px',
            color: 'rgba(255,255,255,0.28)',
            letterSpacing: '0.8px',
          }}
        >
          alvessa.nl
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
