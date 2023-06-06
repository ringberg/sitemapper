import { PassThrough } from 'stream'
import { pipeline } from 'stream/promises'
import { SitemapperError } from './SitemapperError'
import { DEFAULT_HEAD, DEFAULT_TAIL, MAX_BYTES, MAX_ITEMS } from './consts'
import type {
  ChunkOrNewIndex,
  GetDestinations,
  SitemapItem,
  SitemapperOptions,
} from './types'
import { toBuffer } from './utils'

export class Sitemapper {
  private readonly maxItems: number
  private readonly maxBytes: number
  private readonly head: Buffer
  private readonly tail: Buffer
  private readonly reservedBytes: number
  private currentItems = 0
  private currentBytes = 0
  private index = -1

  constructor(private readonly options?: SitemapperOptions) {
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

  public async streamGenerate(
    getDestinations: GetDestinations,
    items: AsyncIterable<SitemapItem>
  ): Promise<void> {
    let passThrough: PassThrough | undefined
    let promise: Promise<void> | undefined

    for await (const chunkOrIndex of this.generate(items)) {
      if (Buffer.isBuffer(chunkOrIndex)) {
        passThrough?.write(chunkOrIndex)
      } else {
        // handle new index
        const destinations = getDestinations(chunkOrIndex)

        passThrough?.end()
        if (promise) await promise

        passThrough = new PassThrough()
        promise = pipeline([passThrough, ...destinations])
      }
    }
    passThrough?.end()
    if (promise) await promise
  }

  public async *generate(
    items: AsyncIterable<SitemapItem>
  ): AsyncIterable<ChunkOrNewIndex> {
    for await (const item of items) {
      if (this.currentItems === 0) {
        yield ++this.index
        yield this.head
        this.currentBytes = this.reservedBytes
      }
      const chunk = toBuffer(item)

      if (!this.canFit(chunk)) {
        yield this.tail
        this.resetCurrent()
        yield ++this.index
        yield this.head
        this.currentBytes = this.reservedBytes
      }

      yield chunk
      this.currentItems++
      this.currentBytes += chunk.byteLength
      if (
        this.currentItems === this.maxItems ||
        this.currentBytes === this.maxBytes
      ) {
        yield this.tail
        this.resetCurrent()
      }
    }

    if (this.currentItems > 0) yield this.tail
  }

  private resetCurrent(): void {
    this.currentItems = 0
    this.currentBytes = 0
  }

  private canFit(buf: Buffer): boolean {
    return this.currentBytes + buf.byteLength <= this.maxBytes
  }
}

export * from './consts'
export type * from './types'
