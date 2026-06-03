import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { pickInitialLocale } from '@/lib/i18n/detect';
import { translate } from '@/lib/i18n/t';
import { CATALOG } from '@/lib/i18n/catalog';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

async function getLocale() {
  const cookieValue = (await cookies()).get('rr_locale')?.value;
  const acceptLanguage = (await headers()).get('accept-language');
  return pickInitialLocale(cookieValue, acceptLanguage);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: translate(CATALOG[locale], 'meta.title', undefined, CATALOG.en),
    description: translate(CATALOG[locale], 'meta.description', undefined, CATALOG.en),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
