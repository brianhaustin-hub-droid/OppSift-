import { useEffect } from 'react';
import siteContent from './site-content.json';

export type PageMeta = (typeof siteContent.pages)[keyof typeof siteContent.pages];

export const SITE = siteContent.site;

export function pageMeta(path: string): PageMeta | null {
  const entry = (siteContent.pages as Record<string, PageMeta | undefined>)[path];
  return entry ?? null;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

/**
 * Applies the per-route title, description, canonical and social metadata.
 * The same values are written into the prerendered HTML at build time, so a
 * crawler that does not run JavaScript still sees them.
 */
export function applyPageMeta(path: string) {
  if (typeof document === 'undefined') return;
  const meta = pageMeta(path);

  // Application routes (workspace, authentication, shared notices) are not
  // public content: they are marked noindex and never given a canonical URL
  // that would compete with a marketing page.
  if (!meta) {
    document.title = path.startsWith('/o/')
      ? `Shared notice — ${SITE.name}`
      : `${SITE.name} — Workspace`;
    upsertMeta('name', 'robots', 'noindex,nofollow');
    const canonicalTag = document.head.querySelector('link[rel="canonical"]');
    if (canonicalTag) canonicalTag.remove();
    return;
  }

  const canonical = `${SITE.origin}${path === '/' ? '/' : path}`;
  const title = meta.title;
  const description = meta.description;

  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', 'index,follow');
  upsertLink('canonical', canonical);

  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', SITE.name);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:image', `${SITE.origin}${SITE.ogImage}`);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', `${SITE.origin}${SITE.ogImage}`);
}

/** Keeps the document metadata in step with client-side navigation. */
export function usePageMeta(path: string) {
  useEffect(() => {
    applyPageMeta(path);
  }, [path]);
}
