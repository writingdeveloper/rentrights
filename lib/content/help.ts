export interface HelpOrg {
  name: string;
  description: string; // EN, one line
  url: string; // current, web-verified
  phone?: string; // current, web-verified
  languages?: string[];
  tags: ('city' | 'legal-aid' | 'workshop' | 'hotline' | 'county')[];
}

/**
 * Directory of free tenant-help organizations serving Los Angeles.
 * All URLs and phone numbers are web-verified as of 2026-06-02.
 */
export const HELP_ORGS: HelpOrg[] = [
  {
    name: 'LAHD (LA Housing Department)',
    description:
      'The City of LA agency that administers the RSO. Confirm your rent-law status and file complaints.',
    url: 'https://housing.lacity.gov',
    phone: '(866) 557-7368',
    languages: ['English', 'Spanish'],
    tags: ['city', 'hotline'],
  },
  {
    name: 'Stay Housed LA',
    description:
      'City/County tenant-defense partnership offering free workshops, legal clinics, and eviction-defense representation for LA County renters.',
    url: 'https://www.stayhousedla.org',
    phone: '(888) 694-0040',
    languages: ['English', 'Spanish'],
    tags: ['legal-aid', 'workshop', 'hotline'],
  },
  {
    name: 'SAJE (Strategic Actions for a Just Economy)',
    description:
      'Grassroots tenant-organizing and economic-justice nonprofit in South LA — workshops, know-your-rights resources, and community campaigns.',
    url: 'https://saje.net',
    phone: '(213) 745-9961',
    languages: ['English', 'Spanish'],
    tags: ['workshop'],
  },
  {
    name: 'Legal Aid Foundation of Los Angeles (LAFLA)',
    description:
      'Nonprofit law firm providing free legal representation to low-income tenants facing eviction and housing discrimination across Greater LA.',
    url: 'https://lafla.org',
    phone: '(800) 399-4529',
    languages: ['English', 'Spanish'],
    tags: ['legal-aid'],
  },
  {
    name: 'LA County DCBA (Dept. of Consumer & Business Affairs)',
    description:
      'County agency administering rent stabilization and tenant protections for unincorporated LA County — mediation and complaint intake.',
    url: 'https://dcba.lacounty.gov',
    phone: '(800) 593-8222',
    languages: ['English', 'Spanish'],
    tags: ['county', 'hotline'],
  },
  {
    name: 'Coalition for Economic Survival (CES)',
    description:
      'Grassroots tenant-organizing group since 1973; free Saturday Tenants\' Rights Clinic via Zoom and wrongful-eviction support in LA.',
    url: 'https://www.cesinaction.org',
    phone: '(213) 252-4411',
    languages: ['English', 'Spanish'],
    tags: ['workshop'],
  },
  {
    name: 'Inner City Law Center',
    description:
      'Poverty-law firm fighting homelessness and housing loss for low-income tenants, veterans, and people with disabilities in LA.',
    url: 'https://innercitylaw.org',
    phone: '(213) 891-2880',
    languages: ['English'],
    tags: ['legal-aid'],
  },
  {
    name: 'Neighborhood Legal Services of LA County (NLSLA)',
    description:
      'Free legal aid for eviction defense, rent control, and housing discrimination for low-income residents throughout LA County.',
    url: 'https://nlsla.org',
    phone: '(800) 433-6251',
    languages: ['English', 'Spanish'],
    tags: ['legal-aid'],
  },
];

/**
 * Returns HELP_ORGS ordered by relevance for the given address context.
 * When the address is in unincorporated LA County, the County DCBA resource
 * is surfaced first because County rules (not City RSO) apply there.
 */
export function orgsFor(opts: { unincorporatedCounty?: boolean } = {}): HelpOrg[] {
  if (opts.unincorporatedCounty) {
    const county = HELP_ORGS.filter((o) => o.tags.includes('county'));
    const rest = HELP_ORGS.filter((o) => !o.tags.includes('county'));
    return [...county, ...rest];
  }
  return HELP_ORGS;
}
