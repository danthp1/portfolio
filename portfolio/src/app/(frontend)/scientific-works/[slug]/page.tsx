import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'
import { Media as _Media } from '@/components/Media'
import RelatedExperience from '@/components/RelatedExperience'

import { PostHero } from '@/heros/PostHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import PDFViewerClient from './pdf-viewer.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const scientificWorks = await payload.find({
    collection: 'scientific-works',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = scientificWorks.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function ScientificWork({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const url = '/scientific-works/' + slug
  const scientificWork = await queryScientificWorkBySlug({ slug })

  if (!scientificWork) return <PayloadRedirects url={url} />

  return (
    <article className="pt-16 pb-16">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <PostHero post={scientificWork} />

      <div className="flex flex-col items-center gap-4 pt-8">
        <div className="container">
          <RichText className="max-w-[48rem] mx-auto" data={scientificWork.content} enableGutter={false} />

          {scientificWork.relatedExperience && scientificWork.relatedExperience.length > 0 && (
            <div className="max-w-[48rem] mx-auto">
              <RelatedExperience experiences={scientificWork.relatedExperience} />
            </div>
          )}
        </div>
      </div>

      {scientificWork.pdfFile && (
        <div className="flex flex-col items-center gap-4 pt-8">
          <div className="container">
            <div className="max-w-[48rem] mx-auto">
              <h2 className="text-2xl font-bold mb-4">PDF Document</h2>
              <div className="border border-gray-300 rounded-lg overflow-hidden p-4">
                {typeof scientificWork.pdfFile !== 'string' && (
                  <div className="pdf-container min-h-[600px]">
                    {/* We'll use client-side component for the PDF viewer */}
                    <PDFViewerClient
                      pdfUrl={`/api/media/${scientificWork.pdfFile.id}`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const scientificWork = await queryScientificWorkBySlug({ slug })

  return generateMeta({ doc: scientificWork })
}

const queryScientificWorkBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'scientific-works',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    depth: 1,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
