import { PassThrough } from 'stream'
import test from 'tape'
import type {
  SitemapItem,
  SitemapItemAlternate,
  SitemapperOptions,
} from '../src'
import { MAX_BYTES, MAX_ITEMS, Sitemapper } from '../src'

test('SitemapStream should write a sitemap as expected', (test) => {
  const { sitemapper } = setup()
  let buf = Buffer.of()

  const lastMod = new Date('1970-01-01T00:00:00.000Z')
  const alternate: SitemapItemAlternate = {
    href: `${dummyDomain}/en/slug`,
    hreflang: 'de',
  }
  const item: SitemapItem = {
    loc: `${dummyDomain}/en/slug`,
    lastMod,
    alternates: [alternate],
  }

  const expected = `<urlset><url><loc>${
    item.loc
  }</loc><lastmod>${lastMod.toISOString()}</lastmod><xhtml:link rel="alternate" hreflang="${
    alternate.hreflang
  }" href="${alternate.href}"/></url></urlset>`

  const stream = new PassThrough()
    .on('data', (chunk: Buffer) => (buf = Buffer.concat([buf, chunk])))
    .on('finish', () => {
      const actual = buf.toString()
      test.equal(actual, expected)
      test.end()
    })

  async function* generator(): AsyncIterable<SitemapItem> {
    yield item
  }

  sitemapper.streamGenerate(() => [stream], generator())
})

const dummyDomain = 'https://www.example.example'

type Setup = {
  sitemapper: Sitemapper
  options: SitemapperOptions
}
function setup(): Setup {
  const options: SitemapperOptions = {
    maxBytes: MAX_BYTES,
    maxItems: MAX_ITEMS,
    head: '<urlset>',
    tail: '</urlset>',
  }
  const sitemapper = new Sitemapper(options)
  return {
    sitemapper,
    options,
  }
}
