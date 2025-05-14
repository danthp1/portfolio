"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "../../../../../Downloads/polyphone-synth (1)/components/ui/button"
import { Volume2, VolumeX, Camera, CameraOff, Maximize, Minimize, RefreshCw } from "lucide-react"
import * as handpose from "@tensorflow-models/handpose"
import "@tensorflow/tfjs-core"
import "@tensorflow/tfjs-backend-webgl"

// Define finger indices for the HandPose model
const fingerLookupIndices = {
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20],
}

// Define the structure for a finger sound
interface FingerSound {
  id: string
  active: boolean
  frequency: number
  oscillators: OscillatorNode[]
  gain: GainNode | null
  position: { x: number; y: number }
  distance: number
}

// Audio visualization parameters
interface VisualizationParams {
  rotation: number
  scale: number
  complexity: number
  intensity: number
  symmetry: number
}

export default function CameraPolyphoneSynthesizer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const visualizationCanvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const handposeModelRef = useRef<handpose.HandPose | null>(null)
  const fingerSoundsRef = useRef<Map<string, FingerSound>>(new Map())
  const animationFrameRef = useRef<number | null>(null)
  const visualParamsRef = useRef<VisualizationParams>({
    rotation: 0,
    scale: 1,
    complexity: 5,
    intensity: 0.5,
    symmetry: 4,
  })
  const lastHandDetectionRef = useRef<number>(0)
  const handConfidenceRef = useRef<number>(0)

  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [handDetected, setHandDetected] = useState(false)

  // Initialize audio context
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Create analyzer for visualization
      const analyser = audioContextRef.current.createAnalyser()
      analyser.fftSize = 2048
      analyser.connect(audioContextRef.current.destination)
      analyserRef.current = analyser

      setIsAudioInitialized(true)
    }
  }

  // Load the HandPose model
  const loadHandposeModel = async () => {
    try {
      const model = await handpose.load({
        detectionConfidence: 0.7, // Increase detection confidence
        maxHands: 1, // Focus on one hand for better performance
      })
      handposeModelRef.current = model
      setIsModelLoaded(true)
      console.log("Handpose model loaded")
    } catch (error) {
      console.error("Failed to load handpose model:", error)
      setErrorMessage("Failed to load hand detection model. Please try again.")
    }
  }

  // Start the camera
  const startCamera = async () => {
    if (!videoRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user",
          // Request higher framerate for better tracking
          frameRate: { ideal: 30, max: 60 },
        },
      })

      videoRef.current.srcObject = stream
      setIsCameraOn(true)
      setErrorMessage(null)

      // Initialize audio on camera start (requires user interaction)
      initAudio()

      // Load the model if not already loaded
      if (!isModelLoaded && !handposeModelRef.current) {
        loadHandposeModel()
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      setErrorMessage("Could not access camera. Please check permissions and try again.")
    }
  }

  // Stop the camera
  const stopCamera = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return

    const stream = videoRef.current.srcObject as MediaStream
    const tracks = stream.getTracks()

    tracks.forEach((track) => {
      track.stop()
    })

    videoRef.current.srcObject = null
    setIsCameraOn(false)
    setHandDetected(false)

    // Stop all sounds
    stopAllSounds()
  }

  // Toggle camera
  const toggleCamera = () => {
    if (isCameraOn) {
      stopCamera()
    } else {
      startCamera()
    }
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Reload the hand detection model
  const reloadHandDetection = async () => {
    if (handposeModelRef.current) {
      // Reset the model
      handposeModelRef.current = null
      setIsModelLoaded(false)

      // Stop all sounds
      stopAllSounds()

      // Load the model again
      await loadHandposeModel()

      // Reset hand detection state
      setHandDetected(false)
      handConfidenceRef.current = 0
    }
  }

  // Map distance to frequency (using pentatonic scale)
  const mapDistanceToFrequency = (distance: number): number => {
    // Ensure distance is a valid number
    if (!isFinite(distance) || isNaN(distance)) {
      return 440 // Default to A4 (440Hz) if distance is invalid
    }

    // Base frequency range from 220Hz to 880Hz (A3 to A5)
    const minFreq = 220
    const maxFreq = 880

    // Normalize distance (0-200 pixels is a reasonable range for hand size)
    const normalizedDistance = Math.min(Math.max(distance, 0), 200) / 200

    // Pentatonic scale frequencies (relative to base)
    const pentatonic = [1, 1.2, 1.5, 1.8, 2]

    // Calculate base frequency from distance
    const baseFreq = minFreq + (1 - normalizedDistance) * (maxFreq - minFreq)

    // Choose a note from the pentatonic scale based on normalized distance
    const noteIndex = Math.floor(normalizedDistance * pentatonic.length)

    // Ensure we have a valid index
    const safeIndex = Math.min(Math.max(noteIndex, 0), pentatonic.length - 1)

    // Apply pentatonic scale and ensure result is finite
    const result = baseFreq * pentatonic[safeIndex]

    // Final safety check
    return isFinite(result) ? result : 440
  }

  // Create a more pleasant sound with multiple oscillators
  const createPleasantSound = (
    ctx: AudioContext,
    frequency: number,
    analyser: AnalyserNode | null,
  ): { oscillators: OscillatorNode[]; gain: GainNode } => {
    // Create a gain node for volume control
    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.2

    // Connect to analyzer if available
    if (analyser) {
      masterGain.connect(analyser)
    } else {
      masterGain.connect(ctx.destination)
    }

    const oscillators: OscillatorNode[] = []

    // Create primary oscillator (triangle wave)
    const osc1 = ctx.createOscillator()
    osc1.type = "triangle"
    osc1.frequency.value = frequency

    // Create a gain for this oscillator
    const osc1Gain = ctx.createGain()
    osc1Gain.gain.value = 0.6
    osc1.connect(osc1Gain)
    osc1Gain.connect(masterGain)
    osc1.start()
    oscillators.push(osc1)

    // Create secondary oscillator (sine wave, slightly detuned)
    const osc2 = ctx.createOscillator()
    osc2.type = "sine"
    osc2.frequency.value = frequency * 1.005 // Slight detune

    // Create a gain for this oscillator
    const osc2Gain = ctx.createGain()
    osc2Gain.gain.value = 0.4
    osc2.connect(osc2Gain)
    osc2Gain.connect(masterGain)
    osc2.start()
    oscillators.push(osc2)

    // Create third oscillator (sine wave, octave up)
    const osc3 = ctx.createOscillator()
    osc3.type = "sine"
    osc3.frequency.value = frequency * 2 // Octave up

    // Create a gain for this oscillator
    const osc3Gain = ctx.createGain()
    osc3Gain.gain.value = 0.2
    osc3.connect(osc3Gain)
    osc3Gain.connect(masterGain)
    osc3.start()
    oscillators.push(osc3)

    return { oscillators, gain: masterGain }
  }

  // Create or update a finger sound
  const updateFingerSound = (
    fingerId: string,
    active: boolean,
    distance: number,
    position: { x: number; y: number },
  ) => {
    if (!audioContextRef.current || isMuted) return

    // Validate distance
    if (!isFinite(distance) || isNaN(distance)) {
      distance = 100 // Use a default value if distance is invalid
    }

    let fingerSound = fingerSoundsRef.current.get(fingerId)

    // If finger is active and sound doesn't exist, create it
    if (active && !fingerSound) {
      const frequency = mapDistanceToFrequency(distance)

      // Ensure frequency is valid
      if (!isFinite(frequency) || isNaN(frequency)) {
        console.warn(`Invalid frequency calculated for ${fingerId}: ${frequency}`)
        return
      }

      const { oscillators, gain } = createPleasantSound(audioContextRef.current, frequency, analyserRef.current)

      fingerSound = {
        id: fingerId,
        active,
        frequency,
        oscillators,
        gain,
        position,
        distance,
      }

      fingerSoundsRef.current.set(fingerId, fingerSound)
    }
    // If finger exists and is active, update its properties
    else if (active && fingerSound) {
      const frequency = mapDistanceToFrequency(distance)

      // Ensure frequency is valid before updating
      if (!isFinite(frequency) || isNaN(frequency)) {
        console.warn(`Invalid frequency calculated for ${fingerId}: ${frequency}`)
        return
      }

      fingerSound.active = active
      fingerSound.frequency = frequency
      fingerSound.position = position
      fingerSound.distance = distance

      if (fingerSound.oscillators && audioContextRef.current) {
        // Update frequency of all oscillators
        fingerSound.oscillators[0].frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
        fingerSound.oscillators[1].frequency.setValueAtTime(frequency * 1.005, audioContextRef.current.currentTime)
        fingerSound.oscillators[2].frequency.setValueAtTime(frequency * 2, audioContextRef.current.currentTime)
      }
    }
    // If finger is not active but sound exists, stop it
    else if (!active && fingerSound && fingerSound.oscillators) {
      fingerSound.oscillators.forEach((osc) => {
        osc.stop()
        osc.disconnect()
      })
      fingerSound.gain?.disconnect()
      fingerSoundsRef.current.delete(fingerId)
    }
  }

  // Stop all sounds
  const stopAllSounds = () => {
    fingerSoundsRef.current.forEach((sound) => {
      if (sound.oscillators) {
        sound.oscillators.forEach((osc) => {
          osc.stop()
          osc.disconnect()
        })
      }
      if (sound.gain) {
        sound.gain.disconnect()
      }
    })

    fingerSoundsRef.current.clear()
  }

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted)

    if (!isMuted) {
      // Mute all current sounds
      fingerSoundsRef.current.forEach((sound) => {
        if (sound.gain) {
          sound.gain.gain.value = 0
        }
      })
    } else {
      // Restore sounds
      fingerSoundsRef.current.forEach((sound) => {
        if (sound.gain) {
          sound.gain.gain.value = 0.2
        }
      })
    }
  }

  // Update visualization parameters based on hand position
  const updateVisualizationParams = (landmarks: number[][], handScore: number) => {
    if (!landmarks || landmarks.length === 0) return

    // Get palm position
    const palm = landmarks[0]

    // Calculate average position of all fingertips
    const thumbTip = landmarks[4]
    const indexTip = landmarks[8]
    const middleTip = landmarks[12]
    const ringTip = landmarks[16]
    const pinkyTip = landmarks[20]

    // Calculate hand spread (distance between thumb and pinky)
    const handSpread = Math.sqrt(Math.pow(thumbTip[0] - pinkyTip[0], 2) + Math.pow(thumbTip[1] - pinkyTip[1], 2))

    // Calculate hand height (distance from palm to middle finger)
    const handHeight = Math.sqrt(Math.pow(palm[0] - middleTip[0], 2) + Math.pow(palm[1] - middleTip[1], 2))

    // Calculate hand rotation (angle between palm and middle finger)
    const rotation = Math.atan2(middleTip[1] - palm[1], middleTip[0] - palm[0])

    // Update visualization parameters with smoothing based on confidence
    const confidenceFactor = Math.min(handScore, 1)
    const prevParams = visualParamsRef.current

    visualParamsRef.current = {
      rotation: prevParams.rotation * 0.3 + rotation * 0.7 * confidenceFactor,
      scale: prevParams.scale * 0.3 + (handHeight / 100) * 0.7 * confidenceFactor, // Normalize
      complexity: prevParams.complexity * 0.3 + (3 + handSpread / 50) * 0.7 * confidenceFactor, // More spread = more complex
      intensity: prevParams.intensity * 0.3 + (handHeight / 200) * 0.7 * confidenceFactor, // Taller hand = more intensity
      symmetry: prevParams.symmetry * 0.3 + (3 + Math.floor((handSpread / 200) * 5)) * 0.7 * confidenceFactor, // More spread = more symmetry points
    }
  }

  // Draw black and white visualization
  const drawVisualization = () => {
    const canvas = visualizationCanvasRef.current
    if (!canvas || !analyserRef.current) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    // Get frequency data
    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Clear canvas
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Center point
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Get visualization parameters
    const { rotation, scale, complexity, intensity, symmetry } = visualParamsRef.current

    // Draw visualization
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(rotation)

    // Draw multiple layers
    for (let layer = 1; layer <= 5; layer++) {
      const layerScale = scale * layer

      // Draw symmetrical pattern
      for (let i = 0; i < symmetry; i++) {
        ctx.save()
        ctx.rotate(((Math.PI * 2) / symmetry) * i)

        ctx.beginPath()

        // Create a path based on frequency data
        for (let j = 0; j < bufferLength; j += Math.floor(bufferLength / complexity)) {
          const value = dataArray[j] / 128.0
          const x = Math.cos(j * 0.02) * value * 100 * layerScale
          const y = Math.sin(j * 0.02) * value * 100 * layerScale

          if (j === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        // Close the path
        ctx.closePath()

        // Style based on layer
        const alpha = ((6 - layer) / 5) * intensity
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.lineWidth = 6 - layer
        ctx.stroke()

        ctx.restore()
      }
    }

    // Draw center core
    const activeSounds = fingerSoundsRef.current.size
    const coreSize = 20 + activeSounds * 10

    ctx.beginPath()
    ctx.arc(0, 0, coreSize, 0, Math.PI * 2)
    ctx.fillStyle = "white"
    ctx.fill()

    // Draw inner core details
    if (activeSounds > 0) {
      ctx.beginPath()
      ctx.arc(0, 0, coreSize * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = "black"
      ctx.fill()

      // Add another inner white circle
      ctx.beginPath()
      ctx.arc(0, 0, coreSize * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = "white"
      ctx.fill()
    }

    ctx.restore()

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(drawVisualization)
  }

  // Process video frame and detect hands
  const detectHands = async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !handposeModelRef.current ||
      !isCameraOn ||
      videoRef.current.readyState !== 4
    ) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Detect hands
    try {
      const hands = await handposeModelRef.current.estimateHands(video)

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Check if hand is detected
      const now = Date.now()
      if (hands.length > 0) {
        setHandDetected(true)
        lastHandDetectionRef.current = now

        // Update hand confidence
        const handScore = hands[0].handInViewConfidence || 0
        handConfidenceRef.current = handScore

        // Draw confidence indicator
        ctx.fillStyle = `rgba(0, 255, 0, ${handScore})`
        ctx.fillRect(10, 10, 100 * handScore, 10)
        ctx.strokeStyle = "white"
        ctx.strokeRect(10, 10, 100, 10)
      } else {
        // If no hand detected for more than 1 second, update state
        if (now - lastHandDetectionRef.current > 1000) {
          setHandDetected(false)
          handConfidenceRef.current = 0
        }

        // Draw confidence indicator (red when no hand)
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)"
        ctx.fillRect(10, 10, 100 * handConfidenceRef.current, 10)
        ctx.strokeStyle = "white"
        ctx.strokeRect(10, 10, 100, 10)
      }

      // Process each detected hand
      hands.forEach((hand) => {
        const landmarks = hand.landmarks
        const handScore = hand.handInViewConfidence || 0

        // Update visualization parameters based on hand position
        updateVisualizationParams(landmarks, handScore)

        // Get palm position (landmark 0)
        const palm = landmarks[0]

        // Draw palm
        ctx.beginPath()
        ctx.arc(palm[0], palm[1], 10, 0, 2 * Math.PI)
        ctx.fillStyle = "#FFFFFF"
        ctx.fill()

        // Process each finger
        const fingerNames = Object.keys(fingerLookupIndices) as Array<keyof typeof fingerLookupIndices>

        fingerNames.forEach((fingerName) => {
          const indices = fingerLookupIndices[fingerName]
          const fingertip = landmarks[indices[indices.length - 1]]

          // Calculate distance from palm to fingertip
          const distance = Math.sqrt(Math.pow(fingertip[0] - palm[0], 2) + Math.pow(fingertip[1] - palm[1], 2))

          // Validate the distance
          const validDistance = isFinite(distance) ? distance : 100

          // Determine if finger is extended (simple heuristic)
          const isExtended = validDistance > 40 // Threshold in pixels

          // Update sound for this finger
          updateFingerSound(fingerName, isExtended, validDistance, { x: fingertip[0], y: fingertip[1] })

          // Draw finger connection
          if (isExtended) {
            // Draw line from palm to fingertip
            ctx.beginPath()
            ctx.moveTo(palm[0], palm[1])
            ctx.lineTo(fingertip[0], fingertip[1])
            ctx.strokeStyle = "#FFFFFF"
            ctx.lineWidth = 3
            ctx.stroke()

            // Draw fingertip
            ctx.beginPath()
            ctx.arc(fingertip[0], fingertip[1], 8, 0, 2 * Math.PI)
            ctx.fillStyle = "#FFFFFF"
            ctx.fill()

            // Add finger name for better feedback
            ctx.fillStyle = "white"
            ctx.font = "12px Arial"
            ctx.fillText(fingerName, fingertip[0] + 10, fingertip[1])
          }
        })

        // Draw hand skeleton for better visualization
        // Connect joints with lines for better hand structure visualization
        const connectJoints = (joint1: number, joint2: number) => {
          ctx.beginPath()
          ctx.moveTo(landmarks[joint1][0], landmarks[joint1][1])
          ctx.lineTo(landmarks[joint2][0], landmarks[joint2][1])
          ctx.strokeStyle = "rgba(255, 255, 255, 0.7)"
          ctx.lineWidth = 2
          ctx.stroke()
        }

        // Connect palm to finger bases
        connectJoints(0, 1) // palm to thumb base
        connectJoints(0, 5) // palm to index finger base
        connectJoints(0, 9) // palm to middle finger base
        connectJoints(0, 13) // palm to ring finger base
        connectJoints(0, 17) // palm to pinky base

        // Connect finger joints
        for (let i = 1; i < 4; i++) {
          connectJoints(i, i + 1) // thumb
          connectJoints(i + 4, i + 5) // index
          connectJoints(i + 8, i + 9) // middle
          connectJoints(i + 12, i + 13) // ring
          connectJoints(i + 16, i + 17) // pinky
        }

        // Draw all landmarks
        for (let i = 0; i < landmarks.length; i++) {
          const point = landmarks[i]

          // Draw landmark point
          ctx.beginPath()
          ctx.arc(point[0], point[1], 3, 0, 2 * Math.PI)
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
          ctx.fill()
        }
      })

      // If no hands detected, stop all sounds
      if (hands.length === 0) {
        stopAllSounds()
      }
    } catch (error) {
      console.error("Error during hand detection:", error)
    }

    // Continue detection loop
    requestAnimationFrame(detectHands)
  }

  // Initialize camera and model on component mount
  useEffect(() => {
    // Load the handpose model
    if (!isModelLoaded && !handposeModelRef.current) {
      loadHandposeModel()
    }

    // Start visualization
    if (visualizationCanvasRef.current && analyserRef.current) {
      drawVisualization()
    }

    // Clean up on unmount
    return () => {
      stopCamera()
      stopAllSounds()

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Clean up audio context
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Start hand detection when camera and model are ready
  useEffect(() => {
    if (isCameraOn && isModelLoaded && handposeModelRef.current) {
      detectHands()
    }
  }, [isCameraOn, isModelLoaded])

  // Start visualization when audio is initialized
  useEffect(() => {
    if (isAudioInitialized && analyserRef.current) {
      drawVisualization()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isAudioInitialized])

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div
        className={`relative ${isFullscreen ? "fixed inset-0 z-50 bg-black" : "w-full rounded-lg overflow-hidden shadow-xl border border-gray-700"}`}
        style={{ height: isFullscreen ? "100vh" : "60vh", minHeight: "300px" }}
      >
        {/* Video element (hidden) */}
        <video ref={videoRef} className="hidden" autoPlay playsInline />

        {/* Main visualization canvas (fullscreen) */}
        <canvas
          ref={visualizationCanvasRef}
          className="absolute top-0 left-0 w-full h-full touch-none select-none"
          style={{ background: "black", zIndex: 1 }}
        />

        {/* Picture-in-picture camera view */}
        <div
          className={`absolute ${isFullscreen ? "bottom-8 right-8" : "bottom-4 right-4"} touch-none select-none`}
          style={{
            width: isFullscreen ? "250px" : "150px",
            height: isFullscreen ? "187px" : "112px",
            zIndex: 2,
            border: "2px solid white",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
          }}
        >
          <canvas ref={canvasRef} className="w-full h-full touch-none select-none" style={{ background: "#1a1a2e" }} />

          {/* Hand detection status indicator */}
          <div
            className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold ${handDetected ? "bg-green-500" : "bg-red-500"}`}
          >
            {handDetected ? "Hand ✓" : "No Hand"}
          </div>
        </div>

        {/* Overlay for when camera is off */}
        {!isCameraOn && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-80"
            style={{ zIndex: 3 }}
          >
            <p className="text-white mb-4">Kamera ist ausgeschaltet</p>
            <Button onClick={startCamera} className="bg-blue-600 hover:bg-blue-700">
              Kamera starten
            </Button>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center" style={{ zIndex: 4 }}>
            {errorMessage}
          </div>
        )}

        {/* Controls */}
        <div
          className={`absolute ${isFullscreen ? "bottom-8 left-8" : "bottom-4 left-4"} flex space-x-2`}
          style={{ zIndex: 3 }}
        >
          <Button variant="secondary" size="icon" onClick={toggleMute} className="bg-gray-800 hover:bg-gray-700">
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>

          <Button variant="secondary" size="icon" onClick={toggleCamera} className="bg-gray-800 hover:bg-gray-700">
            {isCameraOn ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
          </Button>

          <Button variant="secondary" size="icon" onClick={toggleFullscreen} className="bg-gray-800 hover:bg-gray-700">
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={reloadHandDetection}
            className="bg-gray-800 hover:bg-gray-700"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {!isFullscreen && (
        <div className="mt-6 text-gray-300 text-sm">
          <p className="mb-2">
            <strong>Anleitung:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Positioniere deine Hand vor der Kamera</li>
            <li>Strecke deine Finger aus, um Klänge zu erzeugen</li>
            <li>Jeder Finger erzeugt einen einzigartigen Ton</li>
            <li>Der Abstand zwischen Fingerspitze und Handfläche steuert die Tonhöhe</li>
            <li>Die Visualisierung reagiert auf deine Handbewegungen</li>
            <li>
              Klicke auf <Maximize className="inline h-4 w-4" /> für Vollbildmodus
            </li>
            <li>
              Klicke auf <RefreshCw className="inline h-4 w-4" /> um die Handerkennung neu zu starten
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
