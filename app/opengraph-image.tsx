import { ImageResponse } from 'next/og';

// Guard: keep this route statically prerendered. If it ever went dynamic it
// would run satori + resvg-wasm inside the Cloudflare Worker per request — a
// known rough edge under @opennextjs/cloudflare. force-static turns any
// accidental dynamization into a build-time error instead.
export const dynamic = 'force-static';

export const alt = 'RentRights — Know your LA renter rights, free';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#0a0a0a',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, color: '#60a5fa' }}>RentRights</div>
        <div style={{ fontSize: 44, marginTop: 24, lineHeight: 1.25 }}>
          Know your Los Angeles renter rights — free, no sign-up.
        </div>
        <div style={{ fontSize: 28, marginTop: 32, color: '#9ca3af' }}>
          RSO · AB 1482 · LA County rent caps · just-cause eviction
        </div>
      </div>
    ),
    { ...size },
  );
}
