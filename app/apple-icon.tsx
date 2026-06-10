import { ImageResponse } from 'next/og';

// Keep statically prerendered — see app/opengraph-image.tsx.
export const dynamic = 'force-static';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1d4ed8',
          color: '#ffffff',
          fontSize: 104,
          fontWeight: 800,
        }}
      >
        R
      </div>
    ),
    { ...size },
  );
}
