import { PassThrough } from 'stream'
import { SitemapperError } from './SitemapperError'
import { SitemapperItemDoesNotFitError } from './SitemapperItemDoesNotFitError'
import { DEFAULT_HEAD, DEFAULT_TAIL, MAX_BYTES, MAX_ITEMS } from './consts'
import type { SitemapItem, SitemapperOptions } from './types'

export class SitemapStream extends PassThrough {
  private readonly maxItems: number
  private readonly maxBytes: number
  private readonly head: Buffer
  private readonly tail: Buffer
  private readonly reservedBytes: number
  private currentItems = 0
  private currentBytes = 0
  private resolves: ((siteMapper: SitemapStream) => void)[] = []

  constructor(private options?: SitemapperOptions, public readonly index = 0) {
    super()

    const maxItems = options?.maxItems ?? MAX_ITEMS
    const maxBytes = options?.maxBytes ?? MAX_BYTES
    this.head = Buffer.from(options?.head ?? DEFAULT_HEAD)
    this.tail = Buffer.from(options?.tail ?? DEFAULT_TAIL)
    this.reservedBytes = this.head.byteLength + this.tail.byteLength

    if (maxItems < 1 || maxItems > MAX_ITEMS)
      throw new SitemapperError(
        `maxItems ${maxItems} must be within range 1-${MAX_ITEMS}`
      )

    if (maxBytes < 1 || maxBytes > MAX_BYTES)
      throw new SitemapperError(
        `maxSizeInBytes ${maxBytes} must be within range 1-${MAX_BYTES}`
      )

    if (maxBytes <= this.reservedBytes)
      throw new SitemapperError(
        `maxBytes ${maxBytes} is too small to fit head and tail`
      )
    this.maxItems = maxItems
    this.maxBytes = maxBytes
  }

  public createNew(): SitemapStream {
    return new SitemapStream(this.options, this.index + 1)
  }

  public async insert(item: SitemapItem): Promise<SitemapStream> {
    if (this.currentBytes === 0) {
      this.currentBytes = this.reservedBytes
      super.write(this.head)
    }

    const itemAsBuffer = SitemapStream.toBuffer(item)
    if (this.currentBytes + itemAsBuffer.byteLength > this.maxBytes) {
      throw new SitemapperItemDoesNotFitError()
    }
    const ok = super.write(itemAsBuffer)
    this.currentBytes += itemAsBuffer.byteLength
    this.currentItems++

    if (
      this.currentBytes === this.maxBytes ||
      this.currentItems === this.maxItems
    ) {
      this.end()
      return this.createNew()
    }
    if (!ok) {
      const promise = new Promise<SitemapStream>((resolve) => {
        this.resolves.push(resolve)
      })
      this.once('drain', () => {
        this.resolves.forEach((resolve) => {
          resolve(this)
        })
      })
      return promise
    }
    return this
  }

  public end(): this {
    if (this.writableEnded) return this
    super.write(this.tail)
    return super.end()
  }

  private static toBuffer(
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
}
