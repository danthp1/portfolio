"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion, useAnimationControls } from "framer-motion"

// Definiere die Positionen für die Doodles
export type DoodlePosition =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"



// Definiere die Doodle-Linien mit eingebetteten SVG-Pfaden
const doodlePaths = [
  {
    id: "line-1",
    path: "M986 8.28C599.147 -7.06867 383.241 -1.94671 0 30.9555V80.6071C383.137 50.6027 598.976 45.608 986 57.3452V8.28Z",
    isClosed: false,
    allowedPositions: ["top", "top-left", "top-right"],
  },
  {
    id: "line-2",
    path: "M740.736 78.1339C655.256 69.0053 277.207 108.239 198.242 149.026C198.242 150.969 199.132 151.085 200.216 150.969C209.297 149.998 365.132 120.558 477.978 110.57C514.54 107.333 554.453 104.887 592.083 100.276C629.713 95.6641 740.736 78.1339 740.736 78.1339Z",
    isClosed: true,
    allowedPositions: ["right", "top-right", "bottom-right"],
  },
  {
    id: "line-3",
    path: "M986 8.28C599.147 -7.06867 383.241 -1.94671 0 30.9555V80.6071C383.137 50.6027 598.976 45.608 986 57.3452V8.28Z",
    isClosed: true,
    allowedPositions: ["bottom", "bottom-left", "bottom-right"],
  },
  {
    id: "line-4",
    path: "M305.914 69.5549C66.9296 77.7477 2.41573 24.6893 0.209023 11.2281C-1.25884 2.27398 5.31695 -4.09402 10.1586 4.01145C11.0907 5.57198 9.7684 8.69317 12.1095 11.2281C59.5449 39.0631 100.966 42.835 301.622 48.8773",
    isClosed: false,
    allowedPositions: ["left", "top-left", "bottom-left"],
  },
  {
    id: "line-5",
    path: "M941.867 40.5976C794.265 -7.6454 288.2 29.8553 1 113.841C36.561 91.3091 124.341 63.1056 202.098 45.871C498.67 -8.6221 973.344 -19.5597 979.939 47.2384",
    isClosed: false,
    allowedPositions: ["top", "right", "top-right"],
  },
  {
    id: "line-6",
    path: "M976.603 50.3839C996.528 -31.6907 260.474 -6.4206 9.45748 88.9734C-4.02122 92.1071 -0.505049 105.231 13.755 102.097C361.271 37.6527 606.427 30.0133 831.463 37.6527",
    isClosed: false,
    allowedPositions: ["bottom", "left", "bottom-left"],
  },
  {
    id: "circle-1",
    path: "M50 50 a 50 50 0 1 0 100 0 a 50 50 0 1 0 -100 0 Z",
    isClosed: true,
    allowedPositions: ["top-left", "top-right", "bottom-left", "bottom-right"],
  },
  {
    id: "wave-1",
    path: "M0 50 C 20 0, 40 0, 60 50 S 100 100, 120 50 S 160 0, 180 50 S 220 100, 240 50 Z",
    isClosed: true,
    allowedPositions: ["top", "bottom"],
  },
  {
    id: "zigzag-1",
    path: "M0 0 L 20 40 L 40 0 L 60 40 L 80 0 L 100 40 L 120 0 L 140 40 L 160 0 L 180 40 L 200 0",
    isClosed: false,
    allowedPositions: ["left", "right"],
  },
]

// Farbkonfiguration mit Gewichtungen
export type ColorConfig = {
  color: string
  weight: number
}

// Standard-Farbkonfiguration als Fallback
const defaultColorConfig: ColorConfig[] = [
  { color: "#2563EB", weight: 50 }, // Blau (50% Wahrscheinlichkeit)
  { color: "#8B5CF6", weight: 20 }, // Violett (20% Wahrscheinlichkeit)
  { color: "#EC4899", weight: 15 }, // Pink (15% Wahrscheinlichkeit)
  { color: "#10B981", weight: 10 }, // Grün (10% Wahrscheinlichkeit)
  { color: "#F59E0B", weight: 5 }, // Orange (5% Wahrscheinlichkeit)
]

// Cache für die Farbanalyse
const colorAnalysisCache = new Map<string, ColorConfig[]>()

// Funktion zum Extrahieren der dominanten Farben aus einem Bild
const extractDominantColors = async (imageUrl: string, maxColors = 5): Promise<ColorConfig[]> => {
  // Prüfe, ob die Farben bereits im Cache sind
  if (colorAnalysisCache.has(imageUrl)) {
    return colorAnalysisCache.get(imageUrl) || defaultColorConfig
  }

  return new Promise((resolve) => {
    // Erstelle ein neues Bild-Element
    const img = new Image()
    img.crossOrigin = "anonymous" // Wichtig für CORS

    img.onload = () => {
      // Erstelle ein Canvas-Element
      const canvas = document.createElement("canvas")
      // Reduziere die Größe für bessere Performance
      const maxSize = 100
      const scale = Math.min(maxSize / img.width, maxSize / img.height)
      canvas.width = img.width * scale
      canvas.height = img.height * scale

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(defaultColorConfig)
        return
      }

      // Zeichne das Bild auf das Canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      try {
        // Hole die Pixeldaten
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = imageData.data

        // Zähle die Farben (optimiert durch Sampling)
        const colorCounts: Record<string, number> = {}
        const samplingRate = 4 // Nur jeden 4. Pixel analysieren

        for (let i = 0; i < pixels.length; i += 4 * samplingRate) {
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          const a = pixels[i + 3]

          // Ignoriere transparente Pixel
          if (a < 128) continue

          // Quantisiere die Farben für bessere Gruppierung (reduziere auf 16 Farben pro Kanal)
          const quantizedR = Math.round(r / 16) * 16
          const quantizedG = Math.round(g / 16) * 16
          const quantizedB = Math.round(b / 16) * 16

          const colorKey = `${quantizedR},${quantizedG},${quantizedB}`
          colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1
        }

        // Konvertiere die Farben in ein Array und sortiere nach Häufigkeit
        const colorEntries = Object.entries(colorCounts)
          .map(([key, count]) => {
            const [r, g, b] = key.split(",").map(Number)
            return {
              color: `rgb(${r}, ${g}, ${b})`,
              count,
            }
          })
          .sort((a, b) => b.count - a.count)

        // Beschränke auf die häufigsten Farben
        const topColors = colorEntries.slice(0, maxColors)

        // Berechne die Gesamtzahl der gezählten Pixel
        const totalCount = topColors.reduce((sum, entry) => sum + entry.count, 0)

        // Erstelle die ColorConfig mit Gewichtungen basierend auf der Häufigkeit
        const colorConfig = topColors.map((entry) => ({
          color: entry.color,
          weight: Math.round((entry.count / totalCount) * 100),
        }))

        // Speichere im Cache
        colorAnalysisCache.set(imageUrl, colorConfig)

        resolve(colorConfig)
      } catch (error) {
        console.error("Fehler bei der Farbanalyse:", error)
        resolve(defaultColorConfig)
      }
    }

    img.onerror = () => {
      console.error("Fehler beim Laden des Bildes:", imageUrl)
      resolve(defaultColorConfig)
    }

    // Setze die Bildquelle
    img.src = imageUrl
  })
}

// Funktion zum Auswählen einer zufälligen Farbe basierend auf Gewichtungen
const getRandomColor = (colorConfig: ColorConfig[]): string => {
  // Berechne die Summe aller Gewichtungen
  const totalWeight = colorConfig.reduce((sum, config) => sum + config.weight, 0)

  // Generiere eine zufällige Zahl zwischen 0 und der Gesamtgewichtung
  const randomValue = Math.random() * totalWeight

  // Finde die Farbe basierend auf der zufälligen Zahl und den Gewichtungen
  let weightSum = 0
  for (const config of colorConfig) {
    weightSum += config.weight
    if (randomValue <= weightSum) {
      return config.color
    }
  }

  // Fallback, falls etwas schief geht
  return colorConfig[0]?.color || "#2563EB"
}

// Komponente für eine einzelne Doodle-Linie
interface DoodleLineProps {
  pathData: string
  position: DoodlePosition
  isActive: boolean
  color: string
  isClosed: boolean
}

const DoodleLine: React.FC<DoodleLineProps> = ({ pathData, position, isActive, color, isClosed }) => {
  const controls = useAnimationControls()

  useEffect(() => {
    if (isActive) {
      // Zeichne die Linie
      controls.start({
        pathLength: 1,
        opacity: 1,
        transition: {
          pathLength: { duration: 1, ease: "easeInOut" },
          opacity: { duration: 0.3 },
        },
      })
    } else {
      // Verstecke die Linie
      controls.start({
        pathLength: 0,
        opacity: 0,
        transition: {
          pathLength: { duration: 0.5, ease: "easeInOut" },
          opacity: { duration: 0.3 },
        },
      })
    }
  }, [isActive, controls])

  // Positionierung basierend auf der Position
  const getPositionStyles = () => {
    switch (position) {
      case "top":
        return "top-0 left-1/2 -translate-x-1/2 -translate-y-[10%]"
      case "right":
        return "top-1/2 right-0 translate-x-[10%] -translate-y-1/2"
      case "bottom":
        return "bottom-0 left-1/2 -translate-x-1/2 translate-y-[10%]"
      case "left":
        return "top-1/2 left-0 -translate-x-[10%] -translate-y-1/2"
      case "top-left":
        return "top-0 left-0 -translate-x-[8%] -translate-y-[8%]"
      case "top-right":
        return "top-0 right-0 translate-x-[8%] -translate-y-[8%]"
      case "bottom-left":
        return "bottom-0 left-0 -translate-x-[8%] translate-y-[8%]"
      case "bottom-right":
        return "bottom-0 right-0 translate-x-[8%] translate-y-[8%]"
      default:
        return ""
    }
  }

  // Rotation basierend auf der Position
  const getRotation = () => {
    switch (position) {
      case "top":
        return "rotate-0"
      case "right":
        return "rotate-90"
      case "bottom":
        return "rotate-180"
      case "left":
        return "rotate-270"
      case "top-left":
        return "rotate-45"
      case "top-right":
        return "rotate-135"
      case "bottom-left":
        return "rotate-315"
      case "bottom-right":
        return "rotate-225"
      default:
        return "rotate-0"
    }
  }

  return (
    <div className={cn("absolute z-0 pointer-events-none", getPositionStyles(), getRotation())}>
      <svg
        viewBox="0 0 1000 1000"
        className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96"
        style={{ overflow: "visible" }}
      >
        <motion.path
          d={pathData}
          fill={isClosed ? color : "none"}
          stroke={color}
          strokeWidth={isClosed ? 8 : 5}
          initial={{ pathLength: isClosed ? 1 : 0, opacity: 0, fillOpacity: 0 }}
          animate={{
            pathLength: 1,
            opacity: isActive ? 1 : 0,
            fillOpacity: isActive && isClosed ? 0.3 : 0,
            transition: {
              pathLength: { duration: isClosed ? 0 : 1, ease: "easeInOut" },
              opacity: { duration: 0.3 },
              fillOpacity: { duration: 0.5, delay: isClosed ? 0 : 0.5 },
            },
          }}
        />
      </svg>
    </div>
  )
}

// Funktion zum Filtern der Doodle-Pfade basierend auf der Position
const getPathsForPosition = (position: DoodlePosition) => {
  return doodlePaths.filter(
    (doodle) => doodle.allowedPositions.includes(position) || doodle.allowedPositions.length === 0,
  )
}

// Zufällige Auswahl von Doodle-Pfaden für bestimmte Positionen
const getRandomDoodlesForPositions = (positions: DoodlePosition[], count: number) => {
  const result: Array<{ path: string; position: DoodlePosition; isClosed: boolean }> = []

  // Für jede Position einen passenden Pfad finden
  positions.forEach((position) => {
    const availablePaths = getPathsForPosition(position)
    if (availablePaths.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePaths.length)
      result.push({
        path: availablePaths[randomIndex].path,
        position,
        isClosed: availablePaths[randomIndex].isClosed,
      })
    }
  })

  // Wenn wir mehr Doodles benötigen als Positionen haben, fügen wir zufällige hinzu
  if (result.length < count) {
    const remainingCount = count - result.length
    const allPositions = [
      "top",
      "right",
      "bottom",
      "left",
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ] as DoodlePosition[]

    for (let i = 0; i < remainingCount; i++) {
      const randomPosition = allPositions[Math.floor(Math.random() * allPositions.length)]
      const availablePaths = getPathsForPosition(randomPosition)

      if (availablePaths.length > 0) {
        const randomIndex = Math.floor(Math.random() * availablePaths.length)
        result.push({
          path: availablePaths[randomIndex].path,
          position: randomPosition,
          isClosed: availablePaths[randomIndex].isClosed,
        })
      }
    }
  }

  return result
}

// Zufällige Auswahl von Positionen
const getRandomPositions = (count: number) => {
  const positions: DoodlePosition[] = [
    "top",
    "right",
    "bottom",
    "left",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ]
  const shuffled = [...positions].sort(() => 0.5 - Math.random())

  // Wenn mehr Positionen benötigt werden als verfügbar sind, wiederholen wir einige
  if (count > positions.length) {
    return [...shuffled, ...shuffled].slice(0, count)
  }

  return shuffled.slice(0, count)
}

// Funktion zum Finden des ersten Bildes in einem Element
const findFirstImageUrl = (element: HTMLElement | null): string | null => {
  if (!element) return null

  // Suche nach img-Tags
  const imgElement = element.querySelector("img")
  if (imgElement && imgElement.src) {
    return imgElement.src
  }

  // Suche nach Hintergrundbildern
  const elementsWithBackground = element.querySelectorAll("*")
  for (const el of Array.from(elementsWithBackground)) {
    const style = window.getComputedStyle(el)
    const backgroundImage = style.backgroundImage
    if (backgroundImage && backgroundImage !== "none") {
      const match = backgroundImage.match(/url$$['"]?(.*?)['"]?$$/)
      if (match && match[1]) {
        return match[1]
      }
    }
  }

  return null
}

export interface DoodleHoverEffectV2Props {
  items: {
    title: string
    description: string
    link: string
    content?: React.ReactNode
  }[]
  className?: string
  colorConfig?: ColorConfig[]
  doodleCount?: number
  useImageColors?: boolean
  positionMapping?: Record<DoodlePosition, string[]>
}

export const DoodleHoverEffectV2 = ({
                                      items,
                                      className,
                                      colorConfig = defaultColorConfig,
                                      doodleCount = 8,
                                      useImageColors = true,
                                      positionMapping,
                                    }: DoodleHoverEffectV2Props) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [doodles, setDoodles] = useState<
    { path: string; position: DoodlePosition; color: string; isClosed: boolean }[]
  >([])
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [itemColors, setItemColors] = useState<Record<number, ColorConfig[]>>({})

  // Analysiere die Bilder, wenn die Komponente geladen wird
  useEffect(() => {
    if (!useImageColors) return

    const analyzeImages = async () => {
      const newItemColors: Record<number, ColorConfig[]> = {}

      for (let i = 0; i < items.length; i++) {
        const element = itemRefs.current[i]
        if (!element) continue

        const imageUrl = findFirstImageUrl(element)
        if (!imageUrl) continue

        try {
          const colors = await extractDominantColors(imageUrl)
          newItemColors[i] = colors
        } catch (error) {
          console.error("Fehler bei der Farbanalyse:", error)
        }
      }

      setItemColors(newItemColors)
    }

    // Warte einen Moment, bis die Bilder geladen sind
    const timer = setTimeout(analyzeImages, 500)
    return () => clearTimeout(timer)
  }, [items, useImageColors])

  // Generiere neue Doodles, wenn sich der Hover-Index ändert
  useEffect(() => {
    if (hoveredIndex !== null) {
      const randomPositions = getRandomPositions(doodleCount)

      // Verwende die positionsbasierten Doodles, wenn ein Mapping vorhanden ist
      const doodleData = positionMapping
        ? getRandomDoodlesForPositions(randomPositions, doodleCount)
        : randomPositions.map((position) => {
          // Wähle einen zufälligen Pfad
          const randomDoodleIndex = Math.floor(Math.random() * doodlePaths.length)
          return {
            path: doodlePaths[randomDoodleIndex].path,
            position,
            isClosed: doodlePaths[randomDoodleIndex].isClosed,
          }
        })

      // Verwende die Farben aus dem Bild, wenn verfügbar, sonst die Standard-Farbkonfiguration
      const currentColorConfig = useImageColors && itemColors[hoveredIndex] ? itemColors[hoveredIndex] : colorConfig

      setDoodles(
        doodleData.map((doodle) => ({
          ...doodle,
          color: getRandomColor(currentColorConfig),
        })),
      )
    }
  }, [hoveredIndex, colorConfig, doodleCount, itemColors, useImageColors, positionMapping])

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-10", className)}>
      {items.map((item, idx) => {
        const isHovered = hoveredIndex === idx

        return (
          <a
            href={item?.link}
            key={item?.link}
            ref={(el) => (itemRefs.current[idx] = el)}
            className="relative group block p-2 h-full w-full"
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <AnimatePresence>
              {isHovered && (
                <>
                  {doodles.map((doodle, doodleIdx) => (
                    <DoodleLine
                      key={`doodle-${doodleIdx}`}
                      pathData={doodle.path}
                      position={doodle.position}
                      isActive={isHovered}
                      color={doodle.color}
                      isClosed={doodle.isClosed}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
            <Card>
              {item.content}
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </Card>
          </a>
        )
      })}
    </div>
  )
}

export const Card = ({
                       className,
                       children,
                     }: {
  className?: string
  children: React.ReactNode
}) => {
  return (
    <div
      className={cn(
        "h-full w-full p-4 overflow-hidden bg-white border border-2  border-black relative z-20",
        className,
      )}
    >
      <div className="relative z-50">
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export const CardTitle = ({
                            className,
                            children,
                          }: {
  className?: string
  children: React.ReactNode
}) => {
  return <h4 className={cn("text-black font-bold tracking-wide mt-4", className)}>{children}</h4>
}

export const CardDescription = ({
                                  className,
                                  children,
                                }: {
  className?: string
  children: React.ReactNode
}) => {
  return <p className={cn("mt-8 text-black tracking-wide leading-relaxed text-sm", className)}>{children}</p>
}
