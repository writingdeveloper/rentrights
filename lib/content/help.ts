export interface HelpOrg {
  name: string;
  descriptionKey: string;
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
    descriptionKey: 'help.LAHD.description',
    url: 'https://housing.lacity.gov',
    phone: '(866) 557-7368',
    languages: ['English', 'Spanish'],
    tags: ['city', 'hotline'],
  },
  {
    name: 'Stay Housed LA',
    descriptionKey: 'help.STAY_HOUSED.description',
    url: 'https://www.stayhousedla.org',
    phone: '(888) 694-0040',
    languages: ['English', 'Spanish'],
    tags: ['legal-aid', 'workshop', 'hotline'],
  },
  {
    name: 'SAJE (Strategic Actions for a Just Economy)',
    descriptionKey: 'help.SAJE.description',
    url: 'https://saje.net',
    phone: '(213) 745-9961',
    languages: ['English', 'Spanish'],
    tags: ['workshop'],
  },
  {
    name: 'Legal Aid Foundation of Los Angeles (LAFLA)',
    descriptionKey: 'help.LAFLA.description',
    url: 'https://lafla.org',
    phone: '(800) 399-4529',
    languages: ['English', 'Spanish'],
    tags: ['legal-aid'],
  },
  {
    name: 'LA County DCBA (Dept. of Consumer & Business Affairs)',
    descriptionKey: 'help.DCBA.description',
    url: 'https://dcba.lacounty.gov',
    phone: '(800) 593-8222',
    languages: ['English', 'Spanish'],
    tags: ['county', 'hotline'],
  },
  {
    name: 'Coalition for Economic Survival (CES)',
    descriptionKey: 'help.CES.description',
    url: 'https://www.cesinaction.org',
    phone: '(213) 252-4411',
    languages: ['English', 'Spanish'],
    tags: ['workshop'],
  },
  {
    name: 'Inner City Law Center',
    descriptionKey: 'help.ICLC.description',
    url: 'https://innercitylaw.org',
    phone: '(213) 891-2880',
    languages: ['English'],
    tags: ['legal-aid'],
  },
  {
    name: 'Neighborhood Legal Services of LA County (NLSLA)',
    descriptionKey: 'help.NLSLA.description',
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
