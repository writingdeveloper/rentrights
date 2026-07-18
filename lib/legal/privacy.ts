/**
 * Privacy policy content — the honest, specific disclosure that reconciles the
 * "we don't save your address" promise with our privacy-forward Google Analytics.
 * Bilingual (EN / ES, usted). Rendered by app/privacy/page.tsx (EN + /es/privacy).
 *
 * Kept as data (like lib/seo/cornerstone.ts) so it is unit-testable and the two
 * locales stay in lockstep.
 */
export type PrivacyLocale = 'en' | 'es';

export interface PrivacySection {
  heading: string;
  paragraphs: string[];
}

export interface PrivacyContent {
  title: string;
  /** ISO date the policy last changed — formatted for display by the page. */
  updatedIso: string;
  intro: string;
  sections: PrivacySection[];
  optOutUrl: string;
  contactUrl: string;
  backToTool: string;
}

/** When this policy last changed (analytics disclosure added). */
export const PRIVACY_UPDATED_ISO = '2026-07-17';

const OPT_OUT_URL = 'https://tools.google.com/dlpage/gaoptout';
const CONTACT_URL = 'https://github.com/writingdeveloper/rentrights/issues';

const EN: PrivacyContent = {
  title: 'Privacy',
  updatedIso: PRIVACY_UPDATED_ISO,
  intro:
    "RentRights is a free tool for Los Angeles renters. This page explains, plainly, what we do and don't collect. Short version: we don't save your address or your answers, and the only tracking is privacy-forward, anonymous analytics.",
  sections: [
    {
      heading: "What we don't save",
      paragraphs: [
        "You don't need an account, and there's no sign-up. The address you enter and the answers you give are used to compute your result and are not saved on our servers afterward.",
        "We don't sell or share your personal information, and we don't build a profile of you.",
      ],
    },
    {
      heading: 'Anonymous analytics',
      paragraphs: [
        'We use Google Analytics in a privacy-forward setup to understand whether the tool is actually helping — for example, which pages people read and roughly where visitors come from (country, device type, the site that referred you).',
        "Google's advertising signals and ad personalization are turned off, so this data is not used to target ads. Analytics may set cookies on your device to count visits. This measurement is aggregate and is not tied to your address or your answers.",
      ],
    },
    {
      heading: 'How to opt out',
      paragraphs: [
        "You can opt out of Google Analytics entirely by installing Google's official opt-out browser add-on, or by using your browser's cookie controls and Do-Not-Track / Global Privacy Control settings.",
      ],
    },
    {
      heading: 'Address lookups',
      paragraphs: [
        "To identify your building, the address you enter is sent to public property-records and mapping services that return your parcel and jurisdiction. We don't store the address after your result is computed.",
      ],
    },
    {
      heading: 'Questions or a data request',
      paragraphs: [
        'RentRights is open source. If you have a question about your privacy, or a request about your data, open an issue on our GitHub repository.',
      ],
    },
  ],
  optOutUrl: OPT_OUT_URL,
  contactUrl: CONTACT_URL,
  backToTool: 'Back to RentRights',
};

const ES: PrivacyContent = {
  title: 'Privacidad',
  updatedIso: PRIVACY_UPDATED_ISO,
  intro:
    'RentRights es una herramienta gratuita para inquilinos de Los Ángeles. Esta página explica, con claridad, qué recopilamos y qué no. En resumen: no guardamos su dirección ni sus respuestas, y la única medición es una analítica anónima y respetuosa de la privacidad.',
  sections: [
    {
      heading: 'Lo que no guardamos',
      paragraphs: [
        'No necesita una cuenta ni registrarse. La dirección que ingresa y las respuestas que da se usan para calcular su resultado y no se guardan en nuestros servidores después.',
        'No vendemos ni compartimos su información personal, y no creamos un perfil suyo.',
      ],
    },
    {
      heading: 'Analítica anónima',
      paragraphs: [
        'Usamos Google Analytics con una configuración respetuosa de la privacidad para entender si la herramienta realmente ayuda: por ejemplo, qué páginas se leen y, a grandes rasgos, de dónde vienen las visitas (país, tipo de dispositivo, el sitio que le refirió).',
        'Las señales publicitarias de Google y la personalización de anuncios están desactivadas, así que estos datos no se usan para dirigir anuncios. La analítica puede guardar cookies en su dispositivo para contar visitas. Esta medición es agregada y no se vincula con su dirección ni con sus respuestas.',
      ],
    },
    {
      heading: 'Cómo excluirse',
      paragraphs: [
        'Puede excluirse por completo de Google Analytics instalando el complemento oficial de exclusión de Google para el navegador, o usando los controles de cookies y los ajustes de No Rastrear / Control Global de Privacidad de su navegador.',
      ],
    },
    {
      heading: 'Búsquedas de dirección',
      paragraphs: [
        'Para identificar su edificio, la dirección que ingresa se envía a servicios públicos de registros de propiedad y de mapas que devuelven su parcela y su jurisdicción. No guardamos la dirección después de calcular su resultado.',
      ],
    },
    {
      heading: 'Preguntas o solicitudes sobre sus datos',
      paragraphs: [
        'RentRights es de código abierto. Si tiene una pregunta sobre su privacidad o una solicitud sobre sus datos, abra un issue en nuestro repositorio de GitHub.',
      ],
    },
  ],
  optOutUrl: OPT_OUT_URL,
  contactUrl: CONTACT_URL,
  backToTool: 'Volver a RentRights',
};

export function privacyContent(locale: PrivacyLocale): PrivacyContent {
  return locale === 'es' ? ES : EN;
}
