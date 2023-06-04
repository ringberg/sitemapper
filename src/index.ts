import { SitemapStream } from './SitemapStream'
import { SitemapperItemDoesNotFitError } from './SitemapperItemDoesNotFitError'
import type { SitemapItem, SitemapperOptions } from './types'

class Sitemapper {
  private sitemapStream: SitemapStream

  constructor(options?: SitemapperOptions) {
    this.sitemapStream = new SitemapStream(options)
  }

  public async *generateFrom(
    items: AsyncIterable<SitemapItem>
  ): AsyncGenerator<SitemapStream> {
    yield this.sitemapStream
    let itemsInserted = 0
    for await (const item of items) {
      itemsInserted++
      let maybeNew: SitemapStream
      try {
        maybeNew = await this.sitemapStream.insert(item)
        if (maybeNew != this.sitemapStream) {
          console.log('new stream', itemsInserted)
          itemsInserted = 0
          this.sitemapStream = maybeNew
          yield this.sitemapStream
        }
      } catch (error: unknown) {
        if (error instanceof SitemapperItemDoesNotFitError) {
          this.sitemapStream.end()
          this.sitemapStream = this.sitemapStream.createNew()
          yield this.sitemapStream
          await this.sitemapStream.insert(item)
        } else throw error
      }
    }
    this.sitemapStream.end()
  }
}

export * from './SitemapStream'
export * from './SitemapperError'
export * from './SitemapperItemDoesNotFitError'
export * from './consts'
export type * from './types'
export { Sitemapper }
