import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { Search } from '@/search/Component'
import PageClient from './page.client'
import { CardPostData } from '@/components/Card'

type Args = {
  searchParams: Promise<{
    q: string
  }>
}
export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { q: query } = await searchParamsPromise
  const payload = await getPayload({ config: configPromise })

  const searchResults = await payload.find({
    collection: 'search',
    depth: 1,
    limit: 12,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
      doc: true, // Include the doc field to get the relationTo
    },
    // pagination: false reduces overhead if you don't need totalDocs
    pagination: false,
    ...(query
      ? {
          where: {
            or: [
              {
                title: {
                  like: query,
                },
              },
              {
                'meta.description': {
                  like: query,
                },
              },
              {
                'meta.title': {
                  like: query,
                },
              },
              {
                slug: {
                  like: query,
                },
              },
            ],
          },
        }
      : {}),
  })

  // Transform search results to include the relationTo
  const posts = {
    ...searchResults,
    docs: searchResults.docs.map(doc => {
      // Add the relationTo from the doc field if it exists
      if (doc.doc && doc.doc.relationTo) {
        return {
          ...doc,
          relationTo: doc.doc.relationTo
        }
      }
      return doc
    })
  }

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose text-black max-w-none text-center">
          <h1 className="mb-8 lg:mb-16">Search</h1>

          <div className="max-w-[50rem] mx-auto">
            <Search />
          </div>
        </div>
      </div>

      {posts.totalDocs > 0 ? (
        <div>
          {/* Group results by collection type */}
          {['posts', 'pages', 'art', 'scientific-works', 'resume', 'media', 'categories'].map(collectionType => {
            const collectionResults = posts.docs.filter(doc => doc.relationTo === collectionType);
            if (collectionResults.length === 0) return null;

            return (
              <div key={collectionType} className="mb-12">
                <h2 className="container mb-6 capitalize">{collectionType.replace('-', ' ')}</h2>
                <CollectionArchive posts={collectionResults as CardPostData[]} relationTo={collectionType as 'posts' | 'art' | 'scientific-works' | 'pages' | 'resume' | 'media' | 'categories'} showSource={true} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="container">No results found.</div>
      )}
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Payload Website Template Search`,
  }
}
