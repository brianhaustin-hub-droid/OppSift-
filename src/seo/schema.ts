import siteContent from './site-content.json';

const SITE = siteContent.site;

type JsonLd = Record<string, unknown>;

export function organizationSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.origin}/#organization`,
    name: SITE.name,
    url: SITE.origin,
    logo: `${SITE.origin}${SITE.logo}`,
    description:
      'OppSift is a global opportunity intelligence platform for official tenders, grants and commercial notices.',
    email: SITE.contactEmail,
    sameAs: [],
  };
}

export function websiteSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.origin}/#website`,
    url: SITE.origin,
    name: SITE.name,
    publisher: { '@id': `${SITE.origin}/#organization` },
    inLanguage: 'en',
  };
}

export function softwareApplicationSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web browser',
    url: SITE.origin,
    description: SITE.defaultDescription,
    publisher: { '@id': `${SITE.origin}/#organization` },
  };
}

export function breadcrumbSchema(path: string): JsonLd {
  const meta = (siteContent.pages as Record<string, { title?: string } | undefined>)[path];
  const trail: JsonLd[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${SITE.origin}/`,
    },
  ];
  if (path !== '/' && meta?.title) {
    trail.push({
      '@type': 'ListItem',
      position: 2,
      name: meta.title.split(' — ')[0]?.split(' | ')[0] ?? 'Page',
      item: `${SITE.origin}${path}`,
    });
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail,
  };
}

/**
 * FAQPage markup for the questions actually rendered on the page. Google now
 * limits FAQ rich results to a narrow set of authoritative sites, so this is
 * published as accurate structured data, not as a promise of a rich snippet.
 */
export function faqSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: siteContent.faq.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };
}

const BUILDERS: Record<string, (path: string) => JsonLd> = {
  Organization: () => organizationSchema(),
  WebSite: () => websiteSchema(),
  SoftwareApplication: () => softwareApplicationSchema(),
  BreadcrumbList: (path) => breadcrumbSchema(path),
  FAQPage: () => faqSchema(),
};

export function schemaForPage(path: string): JsonLd[] {
  const meta = (siteContent.pages as Record<string, { jsonLd?: string[] } | undefined>)[path];
  const names = meta?.jsonLd ?? ['Organization', 'WebSite'];
  return names
    .map((name) => BUILDERS[name]?.(path))
    .filter((schema): schema is JsonLd => Boolean(schema));
}
