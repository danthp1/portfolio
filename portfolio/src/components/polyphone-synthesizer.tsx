"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "../../../../../Downloads/polyphone-synth (1)/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"

// Define the structure for a touch point
interface TouchPoint {
  id: number
  x: number
  y: number
  frequency: number
  oscillator: OscillatorNode | null
  gain: GainNode | null
  color: string
}

export default function PolyphoneSynthesizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const touchPointsRef = useRef<Map<number, TouchPoint>>(new Map())
  const [isMuted, setIsMuted] = useState(false)
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)

  // Colors for different touch points
  const colors = [
    "#FF5252",
    "#FF4081",
    "#E040FB",
    "#7C4DFF",
    "#536DFE",
    "#448AFF",
    "#40C4FF",
    "#18FFFF",
    "#64FFDA",
    "#69F0AE",
    "#B2FF59",
    "#EEFF41",
  ]

  // Initialize audio context
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      setIsAudioInitialized(true)
    }
  }

  // Map position to frequency (using pentatonic scale for pleasant sounds)
  const mapToFrequency = (x: number, y: number, width: number, height: number): number => {
    // Base frequency range from 110Hz to 880Hz (A2 to A5)
    const minFreq = 110
    const maxFreq = 880

    // Use x position to determine the base frequency
    const xPercent = x / width

    // Pentatonic scale frequencies (relative to base)
    const pentatonic = [1, 1.2, 1.5, 1.8, 2]

    // Use y position to determine octave shift
    const octaveShift = Math.floor((1 - y / height) * 3)

    // Calculate base frequency from x position
    const baseFreq = minFreq + xPercent * (maxFreq - minFreq)

    // Choose a note from the pentatonic scale based on x position
    const noteIndex = Math.floor(xPercent * pentatonic.length)

    // Apply pentatonic scale and octave shift
    return baseFreq * pentatonic[noteIndex] * Math.pow(2, octaveShift)
  }

  // Create a new touch point
  const createTouchPoint = (id: number, x: number, y: number, width: number, height: number): TouchPoint => {
    if (!audioContextRef.current || isMuted) {
      return { id, x, y, frequency: 0, oscillator: null, gain: null, color: colors[id % colors.length] }
    }

    const frequency = mapToFrequency(x, y, width, height)
    const oscillator = audioContextRef.current.createOscillator()
    const gain = audioContextRef.current.createGain()

    // Set oscillator properties
    oscillator.type = "sine"
    oscillator.frequency.value = frequency

    // Calculate gain based on y position (higher = louder)
    const gainValue = 0.1 + (1 - y / height) * 0.5
    gain.gain.value = gainValue

    // Connect nodes
    oscillator.connect(gain)
    gain.connect(audioContextRef.current.destination)

    // Start oscillator
    oscillator.start()

    return {
      id,
      x,
      y,
      frequency,
      oscillator,
      gain,
      color: colors[id % colors.length],
    }
  }

  // Update an existing touch point
  const updateTouchPoint = (point: TouchPoint, x: number, y: number, width: number, height: number) => {
    if (!point.oscillator || !point.gain || !audioContextRef.current) return

    const frequency = mapToFrequency(x, y, width, height)
    point.frequency = frequency
    point.x = x
    point.y = y

    // Update oscillator frequency
    point.oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)

    // Update gain based on y position
    const gainValue = 0.1 + (1 - y / height) * 0.5
    point.gain.gain.setValueAtTime(gainValue, audioContextRef.current.currentTime)
  }

  // Remove a touch point
  const removeTouchPoint = (id: number) => {
    const point = touchPointsRef.current.get(id)
    if (point && point.oscillator) {
      point.oscillator.stop()
      point.oscillator.disconnect()
    }
    touchPointsRef.current.delete(id)
  }

  // Draw the canvas
  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw background
    ctx.fillStyle = "#1a1a2e"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = "#2a2a3e"
    ctx.lineWidth = 1

    // Vertical lines
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    // Horizontal lines
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Draw touch points and waves
    touchPointsRef.current.forEach((point) => {
      // Draw touch point
      ctx.fillStyle = point.color
      ctx.beginPath()
      ctx.arc(point.x, point.y, 20, 0, Math.PI * 2)
      ctx.fill()

      // Draw ripple effect
      ctx.strokeStyle = point.color
      ctx.lineWidth = 2

      for (let i = 1; i <= 3; i++) {
        const radius = 20 + i * 15
        const alpha = 1 - i * 0.2

        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.globalAlpha = 1

      // Draw frequency visualization
      if (point.frequency > 0) {
        const waveHeight = 30
        const waveLength = point.frequency / 10

        ctx.beginPath()
        ctx.moveTo(0, point.y)

        for (let x = 0; x < canvas.width; x++) {
          const y = point.y + Math.sin(x / waveLength) * waveHeight * (point.gain?.gain.value || 0.5)
          ctx.lineTo(x, y)
        }

        ctx.strokeStyle = point.color
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })

    // Continue animation
    requestAnimationFrame(draw)
  }

  // Handle touch/mouse events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas dimensions
    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Start drawing
    const animationId = requestAnimationFrame(draw)

    // Touch event handlers
    const handleStart = (e: TouchEvent | MouseEvent) => {
      e.preventDefault()

      if (!isAudioInitialized) {
        initAudio()
      }

      if (e instanceof TouchEvent) {
        // Handle touch events
        Array.from(e.changedTouches).forEach((touch) => {
          const rect = canvas.getBoundingClientRect()
          const x = touch.clientX - rect.left
          const y = touch.clientY - rect.top

          touchPointsRef.current.set(
            touch.identifier,
            createTouchPoint(touch.identifier, x, y, canvas.width, canvas.height),
          )
        })
      } else {
        // Handle mouse events
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        touchPointsRef.current.set(
          0, // Use 0 as ID for mouse
          createTouchPoint(0, x, y, canvas.width, canvas.height),
        )
      }
    }

    const handleMove = (e: TouchEvent | MouseEvent) => {
      e.preventDefault()

      if (e instanceof TouchEvent) {
        // Handle touch events
        Array.from(e.changedTouches).forEach((touch) => {
          const point = touchPointsRef.current.get(touch.identifier)
          if (point) {
            const rect = canvas.getBoundingClientRect()
            const x = touch.clientX - rect.left
            const y = touch.clientY - rect.top

            updateTouchPoint(point, x, y, canvas.width, canvas.height)
          }
        })
      } else {
        // Handle mouse events
        const point = touchPointsRef.current.get(0)
        if (point) {
          const rect = canvas.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top

          updateTouchPoint(point, x, y, canvas.width, canvas.height)
        }
      }
    }

    const handleEnd = (e: TouchEvent | MouseEvent) => {
      e.preventDefault()

      if (e instanceof TouchEvent) {
        // Handle touch events
        Array.from(e.changedTouches).forEach((touch) => {
          removeTouchPoint(touch.identifier)
        })
      } else {
        // Handle mouse events
        removeTouchPoint(0)
      }
    }

    // Add event listeners
    canvas.addEventListener("touchstart", handleStart as any)
    canvas.addEventListener("mousedown", handleStart as any)
    canvas.addEventListener("touchmove", handleMove as any)
    canvas.addEventListener("mousemove", handleMove as any)
    canvas.addEventListener("touchend", handleEnd as any)
    canvas.addEventListener("touchcancel", handleEnd as any)
    canvas.addEventListener("mouseup", handleEnd as any)
    canvas.addEventListener("mouseleave", handleEnd as any)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resizeCanvas)

      canvas.removeEventListener("touchstart", handleStart as any)
      canvas.removeEventListener("mousedown", handleStart as any)
      canvas.removeEventListener("touchmove", handleMove as any)
      canvas.removeEventListener("mousemove", handleMove as any)
      canvas.removeEventListener("touchend", handleEnd as any)
      canvas.removeEventListener("touchcancel", handleEnd as any)
      canvas.removeEventListener("mouseup", handleEnd as any)
      canvas.removeEventListener("mouseleave", handleEnd as any)

      // Stop all oscillators
      touchPointsRef.current.forEach((point) => {
        if (point.oscillator) {
          point.oscillator.stop()
          point.oscillator.disconnect()
        }
      })

      // Clear touch points
      touchPointsRef.current.clear()
    }
  }, [isAudioInitialized, isMuted])

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted)

    if (!isMuted) {
      // Mute all current sounds
      touchPointsRef.current.forEach((point) => {
        if (point.gain) {
          point.gain.gain.value = 0
        }
      })
    } else {
      // Restore sounds
      touchPointsRef.current.forEach((point) => {
        if (point.gain && point.y) {
          const canvas = canvasRef.current
          if (canvas) {
            const gainValue = 0.1 + (1 - point.y / canvas.height) * 0.5
            point.gain.gain.value = gainValue
          }
        }
      })
    }
  }

  return (
    <div className="w-full max-w-3xl flex flex-col items-center">
      <div className="w-full relative bg-gray-800 rounded-lg overflow-hidden shadow-xl border border-gray-700">
        <canvas
          ref={canvasRef}
          className="w-full touch-none select-none cursor-pointer"
          style={{ height: "60vh", minHeight: "300px" }}
        />

        <div className="absolute bottom-4 right-4">
          <Button variant="secondary" size="icon" onClick={toggleMute} className="bg-gray-700 hover:bg-gray-600">
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="mt-6 text-gray-300 text-sm">
        <p className="mb-2">
          <strong>Instructions:</strong>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Touch or click different areas to generate sounds</li>
          <li>Use multiple fingers for polyphonic tones</li>
          <li>Horizontal position controls pitch</li>
          <li>Vertical position controls octave and volume</li>
          <li>Click the sound icon to mute/unmute</li>
        </ul>
      </div>
    </div>
  )
}
