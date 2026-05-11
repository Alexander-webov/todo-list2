import './globals.css';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import { ExitIntentProvider } from '@/components/ExitIntentProvider';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://allfreelancershere.ru';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'FreelanceHere — все фриланс-заказы в одном месте',
    template: '%s | FreelanceHere',
  },
  description: 'Агрегатор фриланс-проектов с 8 бирж: FL.ru, Kwork, Freelance.ru, Youdo, Upwork, Freelancer.com, PeoplePerHour, Guru, Обновляется каждую минуту. Полностью бесплатно.',
  keywords: [
    'фриланс заказы', 'агрегатор фриланс', 'найти заказы фриланс',
    'FL.ru заказы', 'Kwork заказы', 'Upwork заказы', 'удалённая работа', 'фриланс биржа',
    'заказы для фрилансеров', 'фриланс проекты', 'найти клиентов фриланс',
    'международный фриланс', 'Freelancer.com', 'PeoplePerHour', 'Guru.com',
  ],
  authors: [{ name: 'FreelanceHere' }],
  creator: 'FreelanceHere',
  publisher: 'FreelanceHere',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: SITE_URL,
    siteName: 'FreelanceHere',
    title: 'FreelanceHere — все фриланс-заказы в одном месте',
    description: 'FL.ru + Kwork + Freelance.ru + Youdo + Upwork + Freelancer.com. Обновляется каждые минуту.',
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: 'FreelanceHere' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreelanceHere — все фриланс-заказы в одном месте',
    description: 'FL.ru + Kwork + Freelance.ru + Youdo + Upwork + Freelancer.com',
    images: [`${SITE_URL}/og-image.png`],
  },
  verification: {
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
};

const YANDEX_METRIKA_ID = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'FreelanceHere',
  url: SITE_URL,
  description: 'Агрегатор фриланс-проектов с 8 бирж: российские и международные площадки в одном месте',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/?search={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'FreelanceHere',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: [],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {process.env.NEXT_PUBLIC_YANDEX_VERIFICATION && (
          <meta name="yandex-verification" content={process.env.NEXT_PUBLIC_YANDEX_VERIFICATION} />
        )}
        <meta name="google-site-verification" content="72vJhUS0537rK-8RQ4TmLRVStFrmvu2MW9-8dMa4B48" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script dangerouslySetInnerHTML={{
          __html: `
          try {
            var t = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        ` }} />

        {YANDEX_METRIKA_ID && (
          <Script id="yandex-metrika" strategy="afterInteractive">
            {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
              (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
              ym(${YANDEX_METRIKA_ID}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });`}
          </Script>
        )}

        {(process.env.NEXT_PUBLIC_YANDEX_RTB_FEED || process.env.NEXT_PUBLIC_YANDEX_RTB_SIDEBAR) && (
          <Script id="yandex-rtb" strategy="afterInteractive">
            {`window.yaContextCb = window.yaContextCb || [];`}
          </Script>
        )}
        {(process.env.NEXT_PUBLIC_YANDEX_RTB_FEED || process.env.NEXT_PUBLIC_YANDEX_RTB_SIDEBAR) && (
          <Script
            src="https://yandex.ru/ads/system/context.js"
            strategy="afterInteractive"
            async
          />
        )}
      </head>
      <body className={inter.variable}>
        {YANDEX_METRIKA_ID && (
          <noscript>
            <div>
              <img src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`}
                style={{ position: 'absolute', left: '-9999px' }} alt="" />
            </div>
          </noscript>
        )}
        {children}
        <ExitIntentProvider />
      </body>
    </html>
  );
}
