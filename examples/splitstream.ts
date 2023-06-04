import { createWriteStream, mkdirSync } from 'fs'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import type { SitemapItem, SitemapStream } from '../src'
import { Sitemapper } from '../src'

async function main(): Promise<void> {
  try {
    mkdirSync(join(__dirname, 'out'))
  } catch {
    /*no-op*/
  }

  const sitemapper = new Sitemapper()

  const promises: Promise<void>[] = []
  for await (const sitemapStream of sitemapper.generateFrom(
    getSitemapItems()
  )) {
    const promise = handleForCountries(sitemapStream)
    promises.push(promise)
  }
  await Promise.all(promises)
}

async function* getSitemapItems(): AsyncGenerator<SitemapItem> {
  const interpolate = '{COUNTRY}'
  const lastMod = new Date().toISOString()
  const langs = ['sv', 'dk', 'en', 'fr', 'eu', 'ap', 'ru', 'de', 'gb']
  for (let i = 0; i < 500_000; i++) {
    const loc = `${interpolate} ${i}`
    const sitemapItem: SitemapItem = {
      loc,
      lastMod,
      alternates: langs.map((hreflang) => ({ hreflang, href: loc })),
    }

    yield sitemapItem
  }
}

async function handleForCountries(sitemapStream: SitemapStream): Promise<void> {
  // prettier-ignore
  const countries = [
    'AE', 'AX', 'BH', 'CL', 'DK', 'FO', 'GP', 'ID', 'JE', 'KR', 'LU',
    'MO', 'NL', 'PR', 'RS', 'SI', 'UA', 'AL', 'AZ', 'BN', 'CN', 'EE',
    'FR', 'GR', 'IE', 'JO', 'KW', 'LV', 'MQ', 'NO', 'PT', 'RU', 'SK',
    'US', 'AM', 'BA', 'BY', 'CY', 'EG', 'GB', 'HK', 'IL', 'JP', 'KZ',
    'MC', 'MT', 'NZ', 'QA', 'SA', 'TH', 'UZ', 'AT', 'BE', 'CA', 'CZ',
    'ES', 'GE', 'HR', 'IS', 'KG', 'LB', 'MD', 'MX', 'PH', 'RE', 'SE',
    'TR', 'VI', 'AU', 'BG', 'CH', 'DE', 'FI', 'GL', 'HU', 'IT', 'KH',
    'LT', 'ME', 'MY', 'PL', 'RO', 'SG', 'TW', 'ZA',
  ]

  const promises = countries.map((country) => {
    // prettier-ignore
    const filepath = join(__dirname, 'out', `${country}-${sitemapStream.index}.xml`)

    return pipeline(
      sitemapStream,
      createWriteStream(filepath).on('finish', () =>
        console.log('wrote', filepath)
      )
    )
  })

  await Promise.all(promises)
}

main()
