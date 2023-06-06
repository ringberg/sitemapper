import { createWriteStream, mkdirSync } from 'fs'
import { join } from 'path'
import { createGzip } from 'zlib'
import type { GetDestinations, SitemapItem } from '../src'
import { Sitemapper } from '../src'

async function* itemGenerator(): AsyncGenerator<SitemapItem> {
  const baseUrl = 'https://www.somereallylongdomaintogeneratelotsofdata.example'

  //prettier-ignore
  const hrefLangs = ['ab', 'aa', 'af', 'ak', 'sq', 'am', 'ar', 'an','hy','as','av','ae']
  for (let i = 0; i < 50_000; i++) {
    const sitemapItem: SitemapItem = {
      loc: `${baseUrl}/en/some-example-slug-${i}`,
      alternates: hrefLangs.map((hreflang) => ({
        href: `${baseUrl}/${hreflang}/some-example-slug-${i}`,
        hreflang,
      })),
    }
    yield Promise.resolve(sitemapItem)
  }
}

async function main(): Promise<void> {
  try {
    mkdirSync(join(__dirname, 'out'))
  } catch {
    /**/
  }

  const smg = new Sitemapper()

  const getDestinationStreams: GetDestinations = (newIndex: number) => {
    const filepath = join(__dirname, 'out', `example-${newIndex}.xml.gz`)
    return [createGzip(), createWriteStream(filepath)]
  }

  await smg.streamGenerate(getDestinationStreams, itemGenerator())
}

main()
