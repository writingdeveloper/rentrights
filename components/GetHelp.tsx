'use client';
import { orgsFor } from '@/lib/content/help';
import { useT } from '@/lib/i18n/LocaleProvider';

export function GetHelp({ unincorporatedCounty = false }: { unincorporatedCounty?: boolean }) {
  const t = useT();
  const orgs = orgsFor({ unincorporatedCounty });
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold">{t('help.title')}</h2>
      <ul className="mt-2 space-y-3">
        {orgs.map((o) => (
          <li key={o.name} className="rounded-xl border border-border p-3">
            <p className="text-sm font-semibold">{o.name}</p>
            <p className="text-sm text-muted-foreground">{t(o.descriptionKey)}</p>
            <div className="mt-1 flex gap-3 text-sm">
              <a className="inline-flex min-h-11 items-center text-primary underline" href={o.url} target="_blank" rel="noopener noreferrer">
                {t('help.website')}
              </a>
              {o.phone && (
                <a className="inline-flex min-h-11 items-center text-primary underline" href={`tel:${o.phone.replace(/[^0-9+]/g, '')}`}>
                  {o.phone}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
