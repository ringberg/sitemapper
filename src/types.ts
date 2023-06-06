export type SitemapperOptions = {
  maxBytes?: number
  maxItems?: number
  head?: string
  tail?: string
}

export type SitemapItem = {
  loc: string
  lastMod?: string | Date
  alternates?: SitemapItemAlternate[]
}

export type IndexGenerator = {
  readonly index: number
  readonly bufferGenerator: AsyncGenerator<Buffer>
}

export type GetDestinations = (newIndex: number) => NodeJS.WritableStream[]

export type SitemapItemAlternate = { hreflang: string; href: string }

export type ChunkOrNewIndex = Buffer | number
