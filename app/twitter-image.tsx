import { ImageResponse } from 'next/og';

// Image metadata
export const alt = 'RentRights — Know your LA renter rights, free, EN/Español';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Statically generated at build time (no request-time APIs used).
// Twitter/X uses summary_large_image; same dimensions as the OG card.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#F6F4EF',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '72px 80px',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* House mark */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 14,
            background: '#1F6B4A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 36,
          }}
        >
          <svg
            viewBox="0 0 32 32"
            width="44"
            height="44"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 6 L26 14 V26 H20 V19 H12 V26 H6 V14 Z"
              fill="#ffffff"
            />
          </svg>
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: '#1F6B4A',
            lineHeight: 1,
            letterSpacing: '-2px',
            marginBottom: 24,
          }}
        >
          RentRights
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 34,
            color: '#3D3B2E',
            lineHeight: 1.35,
            maxWidth: 820,
          }}
        >
          Know your LA renter rights — free, EN/Español
        </div>

        {/* Domain pill */}
        <div
          style={{
            marginTop: 'auto',
            fontSize: 24,
            color: '#6B6552',
            borderTop: '2px solid #D9D5C8',
            paddingTop: 28,
            width: '100%',
          }}
        >
          rentrights.writingdeveloper.blog
        </div>
      </div>
    ),
    { ...size },
  );
}
