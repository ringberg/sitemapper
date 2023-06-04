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

export type SitemapItemAlternate = { hreflang: string; href: string }
