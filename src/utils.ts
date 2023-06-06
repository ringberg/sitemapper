import type { SitemapItem } from './types'

export function toBuffer(
  { loc, lastMod, alternates }: SitemapItem,
  encoding?: BufferEncoding
): Buffer {
  let sitemapXml = '<url>'

  if (lastMod instanceof Date) lastMod = lastMod.toISOString()

  sitemapXml += `<loc>${loc}</loc>`
  if (lastMod) sitemapXml += `<lastmod>${lastMod}</lastmod>`
  alternates?.forEach(
    ({ hreflang, href }) =>
      (sitemapXml += `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`)
  )

  sitemapXml += '</url>'

  return Buffer.from(sitemapXml, encoding)
}
