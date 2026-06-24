import { LEGAL, CapPeriod } from '@/lib/legal/constants';
import { selectDated } from '@/lib/legal/select';
import { formatDate } from '@/lib/format/date';

// Cornerstone SEO/GEO explainer content, locale-aware (EN + ES). EVERY figure
// comes from the dated LEGAL constants (no fabricated numbers; value:null stays
// "pending"), so the visible page, the prose, and the JSON-LD share one source.
// The page is served at /guides/... (EN) and /es/guides/... (ES) — each a distinct
// crawlable URL, mirroring the home / + /es pattern.

export type CornerstoneLocale = 'en' | 'es';

export interface CornerstoneRow {
  key: 'RSO' | 'AB1482' | 'COUNTY_RSTPO';
  name: string;
  cap: string;
  effective: string;
  source: string;
}

export interface CornerstoneFaq {
  q: string;
  a: string;
}

export interface CornerstoneStrings {
  h1: string;
  metaTitle: string;
  metaDescription: string;
  lede: string;
  thWhere: string;
  thCap: string;
  thEffect: string;
  tierNote: string;
  sourcesHeading: string;
  disclaimer: string;
  cta: string;
}

function windowText(from: string, to: string | undefined, locale: CornerstoneLocale): string {
  const f = formatDate(from, locale);
  if (!to) return locale === 'es' ? `desde el ${f}` : `from ${f}`;
  return `${f} – ${formatDate(to, locale)}`;
}

function capText(p: CapPeriod | null, locale: CornerstoneLocale): string {
  const upTo = locale === 'es' ? 'hasta' : 'up to';
  if (!p) return locale === 'es' ? 'consulte la autoridad' : 'see the authority';
  if (p.value != null) return `${upTo} ${p.value}%`;
  if (p.floorPct != null) {
    return locale === 'es'
      ? `${p.floorPct}–${p.ceilingPct ?? 4}% (LAHD publica la cifra exacta ~1 de julio)`
      : `${p.floorPct}–${p.ceilingPct ?? 4}% (LAHD publishes the exact figure ~July 1)`;
  }
  return locale === 'es'
    ? `${upTo} ${p.ceilingPct ?? 3}% (el DCBA publica la cifra exacta ~1 de julio)`
    : `${upTo} ${p.ceilingPct ?? 3}% (DCBA publishes the exact figure ~July 1)`;
}

interface RegimeFig {
  cap: string;
  eff: string;
  src: string;
}
interface Figs {
  rso: RegimeFig;
  ab: RegimeFig;
  co: RegimeFig;
}

function figs(now: Date, locale: CornerstoneLocale): Figs {
  const upTo = locale === 'es' ? 'hasta' : 'up to';
  const rso = selectDated(LEGAL.rsoCapPct, now) as CapPeriod | null;
  const ab = selectDated(LEGAL.ab1482CapPct, now);
  const co = selectDated(LEGAL.countyCapPct, now) as CapPeriod | null;
  return {
    rso: { cap: capText(rso, locale), eff: rso ? windowText(rso.effectiveFrom, rso.effectiveTo, locale) : '', src: rso?.source ?? 'LAHD' },
    ab: {
      cap: ab ? `${upTo} ${ab.value}%` : locale === 'es' ? 'consulte la guía estatal' : 'see state guidance',
      eff: ab ? windowText(ab.effectiveFrom, ab.effectiveTo, locale) : '',
      src: ab?.source ?? 'CA Civ. Code §1947.12 / CPI',
    },
    co: { cap: capText(co, locale), eff: co ? windowText(co.effectiveFrom, co.effectiveTo, locale) : '', src: co?.source ?? 'LA County DCBA' },
  };
}

/** The dated cap rows for the three LA regimes, localized. */
export function cornerstoneRows(now: Date, locale: CornerstoneLocale = 'en'): CornerstoneRow[] {
  const f = figs(now, locale);
  const names =
    locale === 'es'
      ? {
          RSO: 'Ciudad de Los Ángeles — Ordenanza de Estabilización de Rentas (RSO)',
          AB1482: 'California (estatal) — Ley de Protección al Inquilino (AB 1482)',
          COUNTY_RSTPO: 'Área no incorporada del Condado de LA — Estabilización de Rentas (RSTPO)',
        }
      : {
          RSO: 'City of Los Angeles — Rent Stabilization Ordinance (RSO)',
          AB1482: 'California statewide — Tenant Protection Act (AB 1482)',
          COUNTY_RSTPO: 'Unincorporated LA County — Rent Stabilization (RSTPO)',
        };
  return [
    { key: 'RSO', name: names.RSO, cap: f.rso.cap, effective: f.rso.eff, source: f.rso.src },
    { key: 'AB1482', name: names.AB1482, cap: f.ab.cap, effective: f.ab.eff, source: f.ab.src },
    { key: 'COUNTY_RSTPO', name: names.COUNTY_RSTPO, cap: f.co.cap, effective: f.co.eff, source: f.co.src },
  ];
}

/** Answer-first FAQ Q&A (localized), feeding both the visible page and the FAQPage JSON-LD. */
export function cornerstoneFaqs(now: Date, locale: CornerstoneLocale = 'en'): CornerstoneFaq[] {
  const f = figs(now, locale);
  const n = LEGAL.notice;
  if (locale === 'es') {
    return [
      {
        q: '¿Cuánto puede subir mi renta el arrendador en Los Ángeles ahora mismo?',
        a: `Depende de qué ley cubra su unidad. En la Ciudad de LA, las unidades con estabilización de rentas (RSO) pueden subir ${f.rso.cap} (${f.rso.eff}). Las unidades bajo la AB 1482 de California pueden subir ${f.ab.cap}. En el área no incorporada del Condado de LA, el tope estándar es ${f.co.cap}. Ingrese su dirección en el verificador para ver cuál aplica a usted.`,
      },
      {
        q: '¿Cuál es el tope de renta del RSO de la Ciudad de LA para 2026?',
        a: `El RSO permite ${f.rso.cap}, vigente ${f.rso.eff} (fuente: ${f.rso.src}). El 1 de julio de 2026 el RSO cambia a una nueva fórmula — 90% del IPC dentro de un rango de 1%–4% — y LAHD publica la cifra exacta alrededor de esa fecha.`,
      },
      {
        q: '¿Cuánto aviso debe darme mi arrendador antes de subir la renta?',
        a: `En California, el arrendador debe dar al menos ${n.smallIncreaseDays} días de aviso por escrito para un aumento del ${n.largeThresholdPct}% o menos, y ${n.largeIncreaseDays} días para un aumento mayor del ${n.largeThresholdPct}%. Agregue ${n.mailExtraDays} días si el aviso llegó por correo.`,
      },
      {
        q: 'Mi edificio no tiene control de renta — ¿la AB 1482 aún limita mi renta?',
        a: `Con frecuencia, sí. La AB 1482 de California limita los aumentos anuales en todo el estado (${f.ab.cap} en el área de Los Ángeles) y exige "causa justa" para desalojar después de 12 meses. Algunas unidades están exentas — sobre todo la vivienda construida en los últimos 15 años, y ciertas casas unifamiliares o condominios cuando el dueño entregó el aviso de exención requerido.`,
      },
      {
        q: '¿Qué pasa con el área no incorporada del Condado de LA?',
        a: `El área no incorporada del Condado de LA tiene su propia ordenanza de Estabilización de Rentas (RSTPO), administrada por el DCBA del Condado. El tope estándar es ${f.co.cap} (${f.co.eff}); las unidades de propiedades pequeñas autocertificadas y de lujo pueden tener topes algo más altos. También aplican las protecciones de desalojo por causa justa. Confirme su categoría con el DCBA.`,
      },
      {
        q: '¿Cómo verifico si el aumento de mi renta es legal?',
        a: `Ingrese su dirección en RentRights para ver qué ley aplica y el tope actual de su unidad, luego use el verificador de aumentos para comparar su renta actual y la propuesta con ese tope. Esto es una estimación basada en registros públicos y las cifras legales con fecha de arriba — no asesoría legal. Confirme la situación de su unidad con LAHD (ciudad) o el DCBA (condado) antes de actuar.`,
      },
    ];
  }
  return [
    {
      q: 'How much can my landlord raise my rent in Los Angeles right now?',
      a: `It depends on which law covers your unit. In the City of LA, rent-stabilized (RSO) units can be raised ${f.rso.cap} (${f.rso.eff}). Units under California's AB 1482 can be raised ${f.ab.cap}. In unincorporated LA County, the standard cap is ${f.co.cap}. Enter your address in the checker to see which one applies to you.`,
    },
    {
      q: 'What is the City of LA RSO rent cap for 2026?',
      a: `The RSO allows ${f.rso.cap}, effective ${f.rso.eff} (source: ${f.rso.src}). On July 1, 2026 the RSO moves to a new formula — 90% of CPI within a 1%–4% range — and LAHD publishes the exact figure around that date.`,
    },
    {
      q: 'How much notice must my landlord give before raising my rent?',
      a: `In California a landlord must give at least ${n.smallIncreaseDays} days' written notice for an increase of ${n.largeThresholdPct}% or less, and ${n.largeIncreaseDays} days' notice for an increase above ${n.largeThresholdPct}%. Add ${n.mailExtraDays} days if the notice was sent by mail.`,
    },
    {
      q: 'My building is not rent-controlled — does AB 1482 still limit my rent?',
      a: `Often yes. California's AB 1482 caps annual increases statewide (${f.ab.cap} in the Los Angeles area) and requires "just cause" to evict after 12 months. Some units are exempt — most notably housing built within the last 15 years, and certain single-family homes or condos when the owner gave the required written exemption notice.`,
    },
    {
      q: 'What about unincorporated LA County?',
      a: `Unincorporated LA County has its own Rent Stabilization ordinance (RSTPO), administered by the County DCBA. The standard cap is ${f.co.cap} (${f.co.eff}); self-certified small-property and luxury units may have somewhat higher caps. Just-cause eviction protections also apply. Confirm your unit's tier with DCBA.`,
    },
    {
      q: 'How do I check whether my specific rent increase is legal?',
      a: `Enter your address in RentRights to see which rent law applies and your unit's current cap, then use the increase checker to compare your current and proposed rent against that cap. This is an estimate from public records and the dated legal figures above — not legal advice. Confirm your unit's status with LAHD (city) or DCBA (county) before acting.`,
    },
  ];
}

/** Static page strings (localized), with figures interpolated from LEGAL. */
export function cornerstoneStrings(now: Date, locale: CornerstoneLocale = 'en'): CornerstoneStrings {
  const f = figs(now, locale);
  const verified = formatDate(LEGAL.lastVerified, locale);
  if (locale === 'es') {
    return {
      h1: '¿Cuánto puede subir mi renta el arrendador en Los Ángeles? (2026)',
      metaTitle: '¿Cuánto puede subir mi renta el arrendador en Los Ángeles? (2026)',
      metaDescription:
        'En Los Ángeles, cuánto puede subir su renta depende de qué ley cubra su hogar — el RSO de la Ciudad de LA, la AB 1482 de California o la ordenanza del Condado de LA. Vea los topes de 2026 y consulte su dirección.',
      lede: `Cuánto puede subir legalmente su renta en Los Ángeles depende de qué ley cubra su hogar. Las unidades con estabilización de rentas (RSO) en la Ciudad de LA pueden subir ${f.rso.cap} ahora mismo; muchas otras unidades caen bajo la AB 1482 de California (${f.ab.cap}); y el área no incorporada del Condado de LA tiene su propio tope. Ingrese su dirección para ver cuál aplica a usted.`,
      thWhere: 'Dónde vive',
      thCap: 'Aumento anual máximo',
      thEffect: 'Vigente',
      tierNote: `Las unidades de propiedades pequeñas (autocertificadas) y de lujo del Condado no incorporado pueden tener topes algo más altos — confirme su categoría con el DCBA del Condado de LA. Cifras verificadas por última vez el ${verified}; los topes de renta cambian (normalmente cada verano), así que confirme la cifra actual antes de actuar.`,
      sourcesHeading: 'Fuentes oficiales',
      disclaimer:
        'Esta página ofrece información general sobre la ley de renta de Los Ángeles, no asesoría legal sobre su situación específica. Es una estimación basada en cifras legales públicas con fecha — confirme la situación de su unidad con LAHD (ciudad) o el DCBA (condado), o con un proveedor de ayuda legal gratuita, antes de actuar.',
      cta: 'Consulte su dirección →',
    };
  }
  return {
    h1: 'How much can my landlord raise my rent in Los Angeles? (2026)',
    metaTitle: 'How much can my landlord raise my rent in Los Angeles? (2026)',
    metaDescription:
      "In Los Angeles, how much your landlord can raise your rent depends on which law covers your home — the City of LA's RSO, California's AB 1482, or LA County's ordinance. See the 2026 caps and check your address.",
    lede: `How much your landlord can legally raise your rent in Los Angeles depends on which law covers your home. Rent-stabilized (RSO) units in the City of LA can be raised ${f.rso.cap} right now; many other units fall under California's AB 1482 (${f.ab.cap}); and unincorporated LA County has its own cap. Enter your address to see which one applies to you.`,
    thWhere: 'Where you live',
    thCap: 'Max annual increase',
    thEffect: 'In effect',
    tierNote: `Unincorporated-County small-property (self-certified) and luxury units may have somewhat higher caps — confirm your tier with LA County DCBA. Figures last verified ${verified}; rent caps change (typically each summer), so confirm the current number before you act.`,
    sourcesHeading: 'Official sources',
    disclaimer:
      "This page gives general information about Los Angeles rent law, not legal advice about your specific situation. It's an estimate from dated public legal figures — confirm your unit's status with LAHD (city) or DCBA (county), or a free legal-aid provider, before acting.",
    cta: 'Check your address →',
  };
}
