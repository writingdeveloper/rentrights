import { ImageResponse } from 'next/og';
import { Regime } from '@/lib/rules/types';
import { shareCardFields } from '@/lib/share/cardFields';
import { LEGAL } from '@/lib/legal/constants';
import { translate } from '@/lib/i18n/t';
import { CATALOG } from '@/lib/i18n/catalog';

export const runtime = 'nodejs';

// Only renders a card for a real, covered regime. The cap/figures are recomputed
// server-side from the dated LEGAL constants (client params can't tamper them),
// and the URL carries NO address or PII — just the regime + locale.
const VALID_REGIMES: Regime[] = ['RSO', 'AB1482', 'JCO_ONLY', 'COUNTY_RSTPO', 'COUNTY_JCO'];

const CREAM = '#F6F4EF';
const GREEN = '#1F6B4A';
const INK = '#23262B';
const MUTED = '#5B5A54';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const regimeParam = (searchParams.get('regime') ?? '') as Regime;
  const locale = searchParams.get('locale') === 'es' ? 'es' : 'en';
  if (!VALID_REGIMES.includes(regimeParam)) {
    return new Response('Invalid regime', { status: 400 });
  }
  const t = (k: string, p?: Record<string, string | number>) => translate(CATALOG[locale], k, p, CATALOG.en);
  const f = shareCardFields(regimeParam, t, LEGAL.lastVerified, new Date(), locale);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: CREAM,
          display: 'flex',
          flexDirection: 'column',
          padding: '72px',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 44 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: GREEN,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 20,
            }}
          >
            <svg viewBox="0 0 32 32" width="38" height="38" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 6 L26 14 V26 H20 V19 H12 V26 H6 V14 Z" fill="#ffffff" />
            </svg>
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: GREEN, letterSpacing: '-1px' }}>RentRights</div>
        </div>

        {/* Eyebrow */}
        <div style={{ fontSize: 30, color: MUTED, marginBottom: 12 }}>{t('share.cardEyebrow')}</div>

        {/* Regime title */}
        <div style={{ fontSize: 62, fontWeight: 700, color: INK, lineHeight: 1.1, marginBottom: 24 }}>{f.title}</div>

        {/* Plain-language line */}
        {f.plain ? <div style={{ fontSize: 30, color: INK, lineHeight: 1.4, marginBottom: 32 }}>{f.plain}</div> : null}

        {/* Cap block */}
        {f.cap ? (
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
            <div style={{ fontSize: 26, color: MUTED, letterSpacing: '1px' }}>{t('share.cardCapLabel')}</div>
            <div style={{ fontSize: 86, fontWeight: 700, color: GREEN, lineHeight: 1.1 }}>{f.cap}</div>
          </div>
        ) : null}

        {/* As-of stamp (so a forwarded card can't go stale-wrong) */}
        <div style={{ fontSize: 24, color: MUTED }}>{t('share.cardAsOf', { date: f.asOf })}</div>

        {/* Footer: URL + honest disclaimer */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            borderTop: '2px solid #D9D5C8',
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: GREEN, marginBottom: 10 }}>rentrights.writingdeveloper.blog</div>
          <div style={{ fontSize: 22, color: MUTED, lineHeight: 1.4 }}>{t('share.cardDisclaimer')}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
