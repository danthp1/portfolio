"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ArtCarouselProps {
  images: string[] | { url: string; alt?: string }[]
}

export default function ArtCarousel({ images }: ArtCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Hilfsfunktion, um die URL aus einem Bild zu extrahieren
  const getImageUrl = (image: string | { url: string; alt?: string }): string => {
    return typeof image === 'string' ? image : image.url
  }

  // Hilfsfunktion, um den Alt-Text aus einem Bild zu extrahieren
  const getImageAlt = (image: string | { url: string; alt?: string }, index?: number): string => {
    if (typeof image === 'string') {
      return index !== undefined ? `Kunstwerk Bild ${index + 1}` : 'Kunstwerk'
    }
    return image.alt || (index !== undefined ? `Kunstwerk Bild ${index + 1}` : 'Kunstwerk')
  }

  // Wenn keine Bilder vorhanden sind, nicht rendern
  if (!images.length) return null

  // Wenn nur ein Bild vorhanden ist, zeige es ohne Karussell-Steuerelemente
  if (images.length === 1) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg">
        <div className="relative aspect-auto max-h-[70vh] w-full flex justify-center">
          <Image
            src={getImageUrl(images[0]) || "/placeholder.svg"}
            alt={getImageAlt(images[0])}
            width={1200}
            height={800}
            className="object-contain max-h-[70vh]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
        </div>
      </div>
    )
  }

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length)
  }

  return (
    <div className="relative">
      <div className="relative w-full overflow-hidden rounded-lg">
        <div className="relative aspect-auto max-h-[70vh] w-full flex justify-center">
          <Image
            src={getImageUrl(images[currentIndex]) || "/placeholder.svg"}
            alt={getImageAlt(images[currentIndex], currentIndex)}
            width={1200}
            height={800}
            className="object-contain max-h-[70vh]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
        onClick={prevSlide}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Vorheriges Bild</span>
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
        onClick={nextSlide}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Nächstes Bild</span>
      </Button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              currentIndex === index ? "bg-primary w-4" : "bg-muted",
            )}
            onClick={() => setCurrentIndex(index)}
          >
            <span className="sr-only">Gehe zu Bild {index + 1}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
