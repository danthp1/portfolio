"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ArtThumbnailCarouselProps {
  images: string[] | { url: string; alt?: string }[]
  title: string
}

export default function ArtThumbnailCarousel({ images, title }: ArtThumbnailCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [autoplayEnabled, setAutoplayEnabled] = useState(false)

  // Hilfsfunktion, um die URL aus einem Bild zu extrahieren
  const getImageUrl = (image: string | { url: string; alt?: string }): string => {
    return typeof image === 'string' ? image : image.url
  }

  // Hilfsfunktion, um den Alt-Text aus einem Bild zu extrahieren
  const getImageAlt = (image: string | { url: string; alt?: string }, index?: number): string => {
    if (typeof image === 'string') {
      return index !== undefined ? `${title} - Bild ${index + 1}` : title
    }
    return image.alt || (index !== undefined ? `${title} - Bild ${index + 1}` : title)
  }

  // Wenn keine Bilder vorhanden sind, zeige einen Platzhalter
  if (!images.length) {
    return (
      <div className="w-full aspect-[4/3] bg-zinc-900 flex items-center justify-center ">
        <span className="text-zinc-400">Kein Bild</span>
      </div>
    )
  }

  // Wenn nur ein Bild vorhanden ist, zeige es ohne Karussell
  if (images.length === 1) {
    return (
      <div className="w-full aspect-[4/3] relative  overflow-hidden">
        <Image
          src={getImageUrl(images[0]) || "/placeholder.svg"}
          alt={getImageAlt(images[0])}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    )
  }

  // Autoplay starten/stoppen bei Hover
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (autoplayEnabled) {
      interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
      }, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoplayEnabled, images.length])

  const nextSlide = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
  }

  const prevSlide = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length)
  }

  return (
    <div
      className="relative w-full aspect-[4/3] rounded-xl overflow-hidden"
      onMouseEnter={() => {
        setIsHovering(true)
        setAutoplayEnabled(true)
      }}
      onMouseLeave={() => {
        setIsHovering(false)
        setAutoplayEnabled(false)
      }}
    >
      {images.map((image, index) => (
        <div
          key={index}
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            currentIndex === index ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          <Image
            src={getImageUrl(image) || "/placeholder.svg"}
            alt={getImageAlt(image, index)}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      ))}

      {images.length > 1 && isHovering && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 border-none text-white z-10 size-8"
            onClick={prevSlide}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Vorheriges Bild</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 border-none text-white z-10 size-8"
            onClick={nextSlide}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Nächstes Bild</span>
          </Button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all bg-white/70",
                  currentIndex === index ? "w-3" : "",
                )}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCurrentIndex(index)
                }}
              >
                <span className="sr-only">Gehe zu Bild {index + 1}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
