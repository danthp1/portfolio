import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function Page() {
  const payload = await getPayload({ config: configPromise })

  const scientificWorks = await payload.find({
    collection: 'scientific-works',
    depth: 1,
    limit: 12,
    overrideAccess: false,
    select: {
      title: true,
      slug: true,
      meta: true,
      authors: true,
    },
  })

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Scientific Works</h1>
        </div>
      </div>

      <div className="container mb-8">
        <PageRange
          collection="scientific-works"
          currentPage={scientificWorks.page}
          limit={12}
          totalDocs={scientificWorks.totalDocs}
        />
      </div>

      <CollectionArchive posts={scientificWorks.docs} relationTo="scientific-works" />

      <div className="container">
        {scientificWorks.totalPages > 1 && scientificWorks.page && (
          <Pagination page={scientificWorks.page} totalPages={scientificWorks.totalPages} />
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Scientific Works`,
  }
}
