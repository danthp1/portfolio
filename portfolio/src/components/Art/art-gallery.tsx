"use client"

import { format } from "date-fns"
import { de } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import ArtThumbnailCarousel from "./art-thumbnail-carousel"
import { DoodleHoverEffectV2 } from "@/components/Art/doodle-hover-effect-v2"
// Definiere das Positions-Mapping für die Kunstgalerie
const artGalleryPositionMapping: Record<DoodlePosition, string[]> = {
  top: ["line-3", "line-5", "wave-1"],
  right: ["line-2", "line-5", "zigzag-1"],
  bottom: ["line-3", "line-6", "wave-1"],
  left: ["line-4", "line-6", "zigzag-1"],
  "top-left": ["line-1", "line-4", "circle-1"],
  "top-right": ["line-1", "line-5", "circle-1"],
  "bottom-left": ["line-4", "line-6", "circle-1"],
  "bottom-right": ["line-2", "line-3", "circle-1"],
}

interface ArtPiece {
  id: string
  title: string
  slug: string
  heroImage?: {
    url: string
    alt?: string
  }
  publishedAt?: string
  content?: any[]
  layout?: any[]
}

interface ArtGalleryProps {
  artPieces: ArtPiece[]
  currentPage: number
  totalPages: number
}

export default function ArtGallery({ artPieces, currentPage, totalPages }: ArtGalleryProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  // Funktion zum Extrahieren aller Bilder aus einem Kunstwerk
  const extractAllImagesFromArt = (art: ArtPiece) => {
    const images: { url: string; alt?: string }[] = []

    // Füge das Hauptbild hinzu, wenn vorhanden
    if (art.heroImage?.url) {
      images.push({
        url: art.heroImage.url,
        alt: art.heroImage.alt || art.title
      })
    }

    // Hier könnten weitere Bilder aus dem content oder layout extrahiert werden
    // Dies würde eine tiefere Analyse der Inhaltsstruktur erfordern

    return images
  }

  // Formatiere die Kunstwerke für den HoverEffect
  const hoverItems = artPieces.map((art) => {
    // Extrahiere alle Bilder für das Karussell
    const images = extractAllImagesFromArt(art)

    return {
      title: art.title,
      description: art.publishedAt
        ? `Veröffentlicht am ${format(new Date(art.publishedAt), "d. MMMM yyyy", { locale: de })}`
        : "",
      link: `/art/${art.slug}`,
      content: (
        <div className="mb-4">
          <ArtThumbnailCarousel images={images} title={art.title} />
        </div>
      ),
    }
  })

  return (
    <div className="space-y-8">
      <DoodleHoverEffectV2 items={hoverItems} className="gap-4" doodleCount={10} useImageColors={true} />

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(createPageURL(currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm">
            Seite {currentPage} von {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(createPageURL(currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
