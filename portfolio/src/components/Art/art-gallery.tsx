"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ArtThumbnailCarousel from "./art-thumbnail-carousel";
import { DoodleHoverEffectV2 } from "@/components/Art/doodle-hover-effect-v2";

// Define the ArtPiece data structure more strictly, avoiding `any`
interface ArtPiece {
  id: string;
  title: string;
  slug: string;
  heroImage?: {
    url: string;
    alt?: string;
  };
  publishedAt?: string;
  // Optional content and layout blocks, typed as unknown arrays
  content?: Record<string, unknown>[];
  layout?: Record<string, unknown>[];
}

interface ArtGalleryProps {
  artPieces: ArtPiece[];
  currentPage: number;
  totalPages: number;
}

export default function ArtGallery({ artPieces, currentPage, totalPages }: ArtGalleryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  // Extract all images from an art piece
  const extractAllImagesFromArt = (art: ArtPiece) => {
    const images: { url: string; alt?: string }[] = [];

    if (art.heroImage?.url) {
      images.push({
        url: art.heroImage.url,
        alt: art.heroImage.alt || art.title,
      });
    }

    // Additional extraction from `content` or `layout` can be implemented here
    return images;
  };

  // Prepare items for the DoodleHoverEffectV2, no `any` used
  const hoverItems = artPieces.map((art) => ({
    title: art.title,
    description: art.publishedAt
      ? `Veröffentlicht am ${format(new Date(art.publishedAt), "d. MMMM yyyy", { locale: de })}`
      : "",
    link: `/art/${art.slug}`,
    content: (
      <div className="mb-4">
        <ArtThumbnailCarousel images={extractAllImagesFromArt(art)} title={art.title} />
      </div>
    ),
  }));

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
  );
}
