import { Suspense } from "react"
import ArtGallery from "@/components/Art/art-gallery"
import ArtGalleryFilter from "@/components/Art/art-gallery-filter"
import { Skeleton } from "@/components/ui/skeleton"
import configPromise from '@payload-config'
import { getPayload } from 'payload'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function ArtPage({
                                        searchParams,
                                      }: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Parse search params for filtering
  const query = {
    sort: searchParams.sort || "publishedAt",
    limit: searchParams.limit || "12",
    page: searchParams.page || "1",
  }

  return (
    <main className="container mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8 text-center">Kunstgalerie</h1>

      <ArtGalleryFilter />

      <Suspense fallback={<GallerySkeleton />}>
        <ArtGalleryContent query={query} />
      </Suspense>
    </main>
  )
}

async function ArtGalleryContent({ query }: { query: Record<string, string | undefined> }) {
  // Verwende die Payload API um Kunstwerke zu laden
  const payload = await getPayload({ config: configPromise })

  const { docs: artPieces, totalPages, page } = await payload.find({
    collection: 'art',
    depth: 1,
    limit: Number(query.limit) || 12,
    page: Number(query.page) || 1,
    sort: query.sort ? `${query.sort}` : '-publishedAt',
    overrideAccess: false,
    select: {
      title: true,
      slug: true,
      heroImage: true,
      meta: true,
    },
  })

  if (!artPieces || artPieces.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium">Keine Kunstwerke gefunden</h3>
        <p className="text-muted-foreground mt-2">
          Versuche, deine Filter anzupassen oder schaue später wieder vorbei.
        </p>
      </div>
    )
  }

  return <ArtGallery artPieces={artPieces} currentPage={Number(page) || 1} totalPages={totalPages} />
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-10">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-2">
          <div className="bg-black rounded-2xl p-8 space-y-3">
            <Skeleton className="w-full aspect-[4/3] rounded-xl" />
            <Skeleton className="h-6 w-3/4 bg-zinc-800" />
            <Skeleton className="h-4 w-1/2 bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  )
}
