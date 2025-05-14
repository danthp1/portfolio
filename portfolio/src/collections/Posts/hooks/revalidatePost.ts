import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Post, Art, ScientificWork } from '../../../payload-types'

export const revalidatePost: CollectionAfterChangeHook<Post | Art | ScientificWork> = ({
  doc,
  previousDoc,
  collection,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const collectionPath = collection === 'posts' ? 'posts' :
                          collection === 'art' ? 'art' :
                          collection === 'scientific-works' ? 'scientific-works' : '';
    const sitemapTag = `${collectionPath}-sitemap`;

    if (doc._status === 'published') {
      const path = `/${collectionPath}/${doc.slug}`

      payload.logger.info(`Revalidating ${collection} at path: ${path}`)

      revalidatePath(path)
      revalidateTag(sitemapTag)
    }

    // If the item was previously published, we need to revalidate the old path
    if (previousDoc._status === 'published' && doc._status !== 'published') {
      const oldPath = `/${collectionPath}/${previousDoc.slug}`

      payload.logger.info(`Revalidating old ${collection} at path: ${oldPath}`)

      revalidatePath(oldPath)
      revalidateTag(sitemapTag)
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post | Art | ScientificWork> = ({
  doc,
  collection,
  req: { context }
}) => {
  if (!context.disableRevalidate) {
    const collectionPath = collection === 'posts' ? 'posts' :
                          collection === 'art' ? 'art' :
                          collection === 'scientific-works' ? 'scientific-works' : '';
    const sitemapTag = `${collectionPath}-sitemap`;
    const path = `/${collectionPath}/${doc?.slug}`

    revalidatePath(path)
    revalidateTag(sitemapTag)
  }

  return doc
}
