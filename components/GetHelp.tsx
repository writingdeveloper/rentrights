'use client';
import { orgsFor } from '@/lib/content/help';
import { useT } from '@/lib/i18n/LocaleProvider';
import { Icon } from '@/components/Icon';

export function GetHelp({ unincorporatedCounty = false }: { unincorporatedCounty?: boolean }) {
  const t = useT();
  const orgs = orgsFor({ unincorporatedCounty });
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold">{t('help.title')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('help.online.intro')}</p>
      <ul className="mt-2 space-y-3">
        {orgs.map((o) => (
          <li key={o.name} className="rounded-xl border border-border p-3">
            <p className="text-sm font-semibold">{o.name}</p>
            <p className="text-sm text-muted-foreground">{t(o.descriptionKey)}</p>
            <div className="mt-1 flex flex-wrap gap-x-3 text-sm">
              {o.onlineUrl && o.onlineLabelKey && (
                <a
                  className="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline"
                  href={o.onlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="globe" size={14} aria-hidden="true" />{t(o.onlineLabelKey)}
                </a>
              )}
              {o.phone && (
                <a className="inline-flex min-h-11 items-center gap-1 text-primary underline" href={`tel:${o.phone.replace(/[^0-9+]/g, '')}`}>
                  <Icon name="phone" size={14} aria-hidden="true" />{o.phone}
                </a>
              )}
              <a className="inline-flex min-h-11 items-center gap-1 text-primary underline" href={o.url} target="_blank" rel="noopener noreferrer">
                <Icon name="map-pin" size={14} aria-hidden="true" />{t('help.website')}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
