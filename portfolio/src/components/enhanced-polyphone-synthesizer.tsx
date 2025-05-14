"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, Camera, CameraOff, RefreshCw, Sliders, Music } from "lucide-react"
import * as handpose from "@tensorflow-models/handpose"
import "@tensorflow/tfjs-core"
import "@tensorflow/tfjs-backend-webgl"

import { SynthEngine, SYNTH_PRESETS } from "./synth/synth-engine"
import { VisualizationEngine } from "./synth/visualization-engine"
import { FingerAnalyzer, type FingerAnalysis } from "./synth/finger-analyzer"
import PresetSelector from "./preset-selector"
import ParameterDisplay from "./parameter-display"
// Import the WebGL visualization engine and visual mode selector
import { WebGLVisualizationEngine } from "./synth/webgl-visualization-engine"
import VisualModeSelector from "./visual-mode-selector"

// Define the structure for a finger sound
interface FingerSound {
  id: string
  active: boolean
  frequency: number
  oscillators: OscillatorNode[]
  gain: GainNode | null
  position: { x: number; y: number }
  note: string
  velocity: number
}

export default function EnhancedPolyphoneSynthesizer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const visualizationCanvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const handposeModelRef = useRef<handpose.HandPose | null>(null)
  const fingerSoundsRef = useRef<Map<string, FingerSound>>(new Map())
  const synthEngineRef = useRef<SynthEngine | null>(null)
  const visualizationEngineRef = useRef<VisualizationEngine | null>(null)
  const fingerAnalyzerRef = useRef<FingerAnalyzer | null>(null)
  const lastHandPosRef = useRef<{ x: number; y: number } | null>(null)
  const lastHandDetectionRef = useRef<number>(0)
  const handConfidenceRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const parametersRef = useRef({
    filterFrequency: 1000,
    lfoRate: 0.5,
    reverbMix: 0.3,
    delayTime: 0.3,
  })
  const activeNotesRef = useRef<string[]>([])
  const updateCounterRef = useRef(0)
  const webGLVisualizationEngineRef = useRef<WebGLVisualizationEngine | null>(null)

  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [handDetected, setHandDetected] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [activePreset, setActivePreset] = useState("cs80")
  const [parameters, setParameters] = useState({
    filterFrequency: 1000,
    lfoRate: 0.5,
    reverbMix: 0.3,
    delayTime: 0.3,
  })
  const [activeNotes, setActiveNotes] = useState<string[]>([])
  const [chordProgressionActive, setChordProgressionActive] = useState(false)
  // Add these state variables inside the component
  const [visualMode, setVisualMode] = useState(0)
  const [visualModes, setVisualModes] = useState<string[]>([])
  const [isWebGLSupported, setIsWebGLSupported] = useState(true)

  // Initialize audio context
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Create analyzer for visualization
      const analyser = audioContextRef.current.createAnalyser()
      analyser.fftSize = 2048
      analyser.connect(audioContextRef.current.destination)
      analyserRef.current = analyser

      // Create synth engine
      synthEngineRef.current = new SynthEngine(audioContextRef.current, analyser)

      // Replace the existing visualization engine initialization in the initAudio function with:
      // Initialize visualization engine
      if (visualizationCanvasRef.current) {
        // Create WebGL visualization engine
        webGLVisualizationEngineRef.current = new WebGLVisualizationEngine(visualizationCanvasRef.current, analyser)

        // Check if WebGL is supported
        if (webGLVisualizationEngineRef.current.isSupported()) {
          setIsWebGLSupported(true)
          webGLVisualizationEngineRef.current.setPreset(activePreset)
          webGLVisualizationEngineRef.current.start()
          setVisualModes(webGLVisualizationEngineRef.current.getVisualModes())
        } else {
          setIsWebGLSupported(false)
          // Fallback to Canvas 2D visualization
          visualizationEngineRef.current = new VisualizationEngine(visualizationCanvasRef.current, analyser)
          visualizationEngineRef.current.setPreset(activePreset)
          visualizationEngineRef.current.start()
        }
      }

      // Initialize finger analyzer
      fingerAnalyzerRef.current = new FingerAnalyzer()

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


  // Toggle controls
  const toggleControls = () => {
    setShowControls(!showControls)
  }

  // Toggle chord progression
  const toggleChordProgression = () => {
    if (!synthEngineRef.current) return

    if (!chordProgressionActive) {
      synthEngineRef.current.startChordProgression()
      setChordProgressionActive(true)
    } else {
      synthEngineRef.current.stopChordProgression()
      setChordProgressionActive(false)
    }
  }

  // Change synth preset
  const handlePresetChange = (presetKey: string) => {
    setActivePreset(presetKey)

    if (synthEngineRef.current) {
      synthEngineRef.current.applyPreset(SYNTH_PRESETS[presetKey])
    }

    if (visualizationEngineRef.current) {
      visualizationEngineRef.current.setPreset(presetKey)
    }
  }

  // Add this function to handle visual mode changes
  const handleVisualModeChange = (modeIndex: number) => {
    console.log(`Changing visual mode to: ${modeIndex}`)
    setVisualMode(modeIndex)
    if (webGLVisualizationEngineRef.current) {
      webGLVisualizationEngineRef.current.setVisualMode(modeIndex)
    }
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

  // Function to check if parameters have changed significantly
  const haveParametersChangedSignificantly = (newParams: typeof parameters, threshold = 0.01) => {
    const currentParams = parametersRef.current

    return (
      Math.abs(newParams.filterFrequency - currentParams.filterFrequency) / 8000 > threshold ||
      Math.abs(newParams.lfoRate - currentParams.lfoRate) / 10 > threshold ||
      Math.abs(newParams.reverbMix - currentParams.reverbMix) > threshold ||
      Math.abs(newParams.delayTime - currentParams.delayTime) / 0.7 > threshold
    )
  }

  // Function to check if active notes have changed
  const haveActiveNotesChanged = (newNotes: string[]) => {
    const currentNotes = activeNotesRef.current

    if (newNotes.length !== currentNotes.length) return true

    for (let i = 0; i < newNotes.length; i++) {
      if (newNotes[i] !== currentNotes[i]) return true
    }

    return false
  }

  // Create or update a finger sound based on finger analysis
  const updateFingerSound = useCallback(
    (finger: FingerAnalysis) => {
      if (!audioContextRef.current || isMuted || !synthEngineRef.current) return

      const fingerId = finger.name
      let fingerSound = fingerSoundsRef.current.get(fingerId)

      // If finger is active and sound doesn't exist, create it
      if (finger.isExtended && finger.velocity > 0 && !fingerSound) {
        // Create voice with synthesizer engine
        const voice = synthEngineRef.current.createVoice(finger.frequency, finger.velocity)

        fingerSound = {
          id: fingerId,
          active: true,
          frequency: finger.frequency,
          oscillators: voice.oscillators,
          gain: voice.gain,
          position: { x: finger.tipPosition[0], y: finger.tipPosition[1] },
          note: finger.note,
          velocity: finger.velocity,
        }

        fingerSoundsRef.current.set(fingerId, fingerSound)

        // Update active notes
        const newActiveNotes = [...activeNotesRef.current, finger.note]
        activeNotesRef.current = newActiveNotes

        // Only update state occasionally to prevent too many renders
        if (updateCounterRef.current % 5 === 0) {
          if (haveActiveNotesChanged(newActiveNotes)) {
            setActiveNotes(newActiveNotes)
          }
        }
      }
      // If finger exists and is active, update its properties
      else if (finger.isExtended && finger.velocity > 0 && fingerSound) {
        fingerSound.active = true
        fingerSound.frequency = finger.frequency
        fingerSound.position = { x: finger.tipPosition[0], y: finger.tipPosition[1] }

        // Check if note has changed
        if (fingerSound.note !== finger.note) {
          fingerSound.note = finger.note

          // Update active notes
          const newActiveNotes = activeNotesRef.current.filter((n) => n !== fingerSound?.note).concat([finger.note])
          activeNotesRef.current = newActiveNotes

          // Only update state occasionally to prevent too many renders
          if (updateCounterRef.current % 5 === 0) {
            if (haveActiveNotesChanged(newActiveNotes)) {
              setActiveNotes(newActiveNotes)
            }
          }
        }

        fingerSound.velocity = finger.velocity

        // Update the voice in the synthesizer engine
        if (fingerSound.oscillators) {
          synthEngineRef.current.updateVoice(
            {
              oscillators: fingerSound.oscillators,
              gain: fingerSound.gain!,
            },
            finger.frequency,
            finger.velocity,
            { x: finger.tipPosition[0], y: finger.tipPosition[1] },
          )
        }
      }
      // If finger is not active but sound exists, stop it
      else if ((!finger.isExtended || finger.velocity <= 0) && fingerSound && fingerSound.oscillators) {
        fingerSound.oscillators.forEach((osc) => {
          osc.stop()
          osc.disconnect()
        })
        fingerSound.gain?.disconnect()
        fingerSoundsRef.current.delete(fingerId)

        // Update active notes
        const newActiveNotes = activeNotesRef.current.filter((note) => note !== fingerSound?.note)
        activeNotesRef.current = newActiveNotes

        // Only update state occasionally to prevent too many renders
        if (updateCounterRef.current % 5 === 0) {
          if (haveActiveNotesChanged(newActiveNotes)) {
            setActiveNotes(newActiveNotes)
          }
        }
      }
    },
    [isMuted],
  )

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
    activeNotesRef.current = []
    setActiveNotes([])
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

      // Mute master volume
      if (synthEngineRef.current) {
        synthEngineRef.current.setMasterVolume(0)
      }
    } else {
      // Restore sounds
      fingerSoundsRef.current.forEach((sound) => {
        if (sound.gain) {
          sound.gain.gain.value = sound.velocity * 0.3
        }
      })

      // Restore master volume
      if (synthEngineRef.current) {
        synthEngineRef.current.setMasterVolume(0.7)
      }
    }
  }

  // Handle chord updates
  const handleChordUpdate = useCallback(() => {
    if (fingerAnalyzerRef.current) {
      fingerAnalyzerRef.current.updateChord()
    }
  }, [])

  // Process video frame and detect hands
  const detectHands = async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !handposeModelRef.current ||
      !isCameraOn ||
      videoRef.current.readyState !== 4 ||
      !fingerAnalyzerRef.current
    ) {
      // Continue the loop even if we can't detect hands yet
      animationFrameRef.current = requestAnimationFrame(detectHands)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(detectHands)
      return
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Increment update counter
    updateCounterRef.current = (updateCounterRef.current + 1) % 60 // Reset every 60 frames

    // Detect hands
    try {
      const hands = await handposeModelRef.current.estimateHands(video)

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Check if hand is detected
      const now = Date.now()
      const wasHandDetected = handDetected
      const isHandNowDetected = hands.length > 0

      // Only update state if hand detection status has changed
      if (isHandNowDetected !== wasHandDetected) {
        if (isHandNowDetected) {
          setHandDetected(true)
          lastHandDetectionRef.current = now
        } else {
          // If no hand detected for more than 1 second, update state
          if (now - lastHandDetectionRef.current > 1000) {
            setHandDetected(false)
            handConfidenceRef.current = 0
            lastHandPosRef.current = null

            // Stop all sounds when hand disappears
            stopAllSounds()
          }
        }
      }

      // Update hand confidence and draw indicators
      if (isHandNowDetected) {
        // Update hand confidence
        const handScore = hands[0].handInViewConfidence || 0
        handConfidenceRef.current = handScore

        // Draw confidence indicator
        ctx.fillStyle = `rgba(0, 255, 0, ${handScore})`
        ctx.fillRect(10, 10, 100 * handScore, 10)
        ctx.strokeStyle = "white"
        ctx.strokeRect(10, 10, 100, 10)
      } else {
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

        // Analyze hand using finger analyzer
        const handAnalysis = fingerAnalyzerRef.current!.analyzeHand(landmarks, handScore)

        // Get palm position
        const palmPosition = handAnalysis.palmPosition

        // Store palm position for parameter modulation
        lastHandPosRef.current = { x: palmPosition[0], y: palmPosition[1] }

        // Update parameters based on hand position
        if (synthEngineRef.current && handScore > 0.5) {
          const normalizedX = Math.min(Math.max(palmPosition[0], 0), 640) / 640
          const normalizedY = Math.min(Math.max(palmPosition[1], 0), 480) / 480

          // Map hand position to parameters
          const newFilterFreq = 100 + (1 - normalizedY) * 7900
          const newLfoRate = 0.1 + normalizedX * 9.9
          const newReverbMix = normalizedY * 0.8
          const newDelayTime = 0.1 + normalizedX * 0.6

          const newParams = {
            filterFrequency: newFilterFreq,
            lfoRate: newLfoRate,
            reverbMix: newReverbMix,
            delayTime: newDelayTime,
          }

          // Only update parameters if they've changed significantly
          if (haveParametersChangedSignificantly(newParams)) {
            parametersRef.current = newParams

            // Only update state occasionally to prevent too many renders
            if (updateCounterRef.current % 10 === 0) {
              setParameters(newParams)
            }
          }

          // Update visualization engine parameters
          if (visualizationEngineRef.current) {
            visualizationEngineRef.current.updateParams({
              rotation: normalizedX * Math.PI * 2,
              scale: 0.5 + normalizedY * 1.5,
              complexity: 3 + normalizedX * 8,
              intensity: 0.2 + normalizedY * 0.8,
              symmetry: 3 + Math.floor(normalizedX * 8),
            })
          }
        }

        // Update the hand position parameter mapping to include WebGL visualization parameters
        // Inside the detectHands function, where you update parameters based on hand position:
        // Update WebGL visualization parameters
        if (webGLVisualizationEngineRef.current && handScore > 0.5) {
          const normalizedX = Math.min(Math.max(palmPosition[0], 0), 640) / 640
          const normalizedY = Math.min(Math.max(palmPosition[1], 0), 480) / 480

          // Update parameters with more distinct values for better visual differences
          webGLVisualizationEngineRef.current.setParams({
            intensity: 0.3 + normalizedY * 0.7,
            colorShift: normalizedX,
            complexity: 0.2 + normalizedX * 0.8,
            rotation: normalizedY * 2.0,
            // Don't update visualMode here to prevent overriding user selection
          })
        }

        // Draw palm
        ctx.beginPath()
        ctx.arc(palmPosition[0], palmPosition[1], 10, 0, Math.PI * 2)
        ctx.fillStyle = "#FFFFFF"
        ctx.fill()

        // Process each finger from the analysis
        handAnalysis.fingers.forEach((finger) => {
          // Update sound for this finger
          updateFingerSound(finger)

          // Draw finger visualization
          if (finger.isExtended) {
            // Draw line from palm to fingertip
            ctx.beginPath()
            ctx.moveTo(palmPosition[0], palmPosition[1])
            ctx.lineTo(finger.tipPosition[0], finger.tipPosition[1])
            ctx.strokeStyle = "#FFFFFF"
            ctx.lineWidth = 3
            ctx.stroke()

            // Draw fingertip
            ctx.beginPath()
            ctx.arc(finger.tipPosition[0], finger.tipPosition[1], 8, 0, Math.PI * 2)
            ctx.fillStyle = "#FFFFFF"
            ctx.fill()

            // Add finger name and note for better feedback
            ctx.fillStyle = "white"
            ctx.font = "12px Arial"
            ctx.fillText(`${finger.name}: ${finger.note}`, finger.tipPosition[0] + 10, finger.tipPosition[1])

            // Draw bend visualization
            const bendRadius = 15 * finger.bendValue
            if (bendRadius > 2) {
              ctx.beginPath()
              ctx.arc(finger.tipPosition[0], finger.tipPosition[1], bendRadius, 0, Math.PI * 2)
              ctx.strokeStyle = `rgba(255, 255, 255, ${finger.bendValue})`
              ctx.lineWidth = 1
              ctx.stroke()
            }
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
      if (hands.length === 0 && wasHandDetected && now - lastHandDetectionRef.current > 1000) {
        stopAllSounds()
      }
    } catch (error) {
      console.error("Error during hand detection:", error)

      // Add error recovery mechanism
      // If there's an error, we'll wait a bit before trying again to avoid rapid error loops
      // This helps prevent the same error from being triggered repeatedly
      setTimeout(() => {
        if (isCameraOn && handposeModelRef.current) {
          // Only continue if camera is still on and model is available
          animationFrameRef.current = requestAnimationFrame(detectHands)
        }
      }, 1000) // Wait 1 second before trying again

      return // Exit the function to prevent immediate retry
    }

    // Continue detection loop if no errors
    animationFrameRef.current = requestAnimationFrame(detectHands)
  }

  // Initialize camera and model on component mount
  useEffect(() => {
    // Only run browser-specific code on the client side
    if (typeof window === 'undefined') return;

    // Load the handpose model
    if (!isModelLoaded && !handposeModelRef.current) {
      loadHandposeModel()
    }


    // Add chord update event listener
    window.addEventListener("chordUpdate", handleChordUpdate)

    // Update the cleanup in the useEffect to include the WebGL visualization engine
    // Clean up on unmount
    return () => {
      stopCamera()
      stopAllSounds()

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      // Stop visualization
      if (visualizationEngineRef.current) {
        visualizationEngineRef.current.dispose()
      }

      // Stop WebGL visualization
      if (webGLVisualizationEngineRef.current) {
        webGLVisualizationEngineRef.current.dispose()
      }

      // Clean up synth engine
      if (synthEngineRef.current) {
        synthEngineRef.current.dispose()
      }

      // Clean up audio context
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close()
      }

      // Remove event listeners
      window.removeEventListener("chordUpdate", handleChordUpdate)
    }
  }, [handleChordUpdate])

  // Start hand detection when camera and model are ready
  useEffect(() => {
    // Only run browser-specific code on the client side
    if (typeof window === 'undefined') return;

    if (isCameraOn && isModelLoaded && handposeModelRef.current) {
      // Cancel any existing animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Start the detection loop
      animationFrameRef.current = requestAnimationFrame(detectHands)

      // Clean up on unmount or when dependencies change
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
      }
    }
  }, [isCameraOn, isModelLoaded])

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div
        className="relative w-full rounded-lg overflow-hidden shadow-xl border border-gray-700"
        style={{
          height: "100vh",
          minHeight: "300px",
          display: "block", // Ensure container is displayed as block
          visibility: "visible", // Explicitly set visibility
          opacity: 1, // Ensure container is fully opaque
          position: "relative" // Reinforce positioning
        }}
      >
        {/* Video element (hidden) */}
        <video ref={videoRef} className="hidden" autoPlay playsInline />

        {/* Main visualization canvas */}
        <canvas
          ref={visualizationCanvasRef}
          className="absolute top-0 left-0 w-full h-full touch-none select-none"
          style={{
            background: "black",
            zIndex: 1,
            display: "block", // Ensure canvas is displayed as block
            visibility: "visible", // Explicitly set visibility
            opacity: 1 // Ensure canvas is fully opaque
          }}
        />

        {/* Picture-in-picture camera view */}
        <div
          className="absolute bottom-4 right-4 touch-none select-none"
          style={{
            width: "150px",
            height: "112px",
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

          {/* Add WebGL status indicator */}
          {isWebGLSupported ? (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold bg-green-500">WebGL ✓</div>
          ) : (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold bg-yellow-500">WebGL ✗</div>
          )}
        </div>


        {/* Controls panel */}
        {showControls && (
          <div
            className="absolute top-4 left-4 bg-gray-900 bg-opacity-90 p-4 rounded-lg border border-gray-700"
            style={{
              zIndex: 1001,
              width: "280px",
              pointerEvents: "auto",
              maxHeight: "80vh",
              overflowY: "auto",
              position: "relative"
            }}
          >
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white">Synthesizer Controls</h3>

              <PresetSelector presets={SYNTH_PRESETS} activePreset={activePreset} onPresetChange={handlePresetChange} />

              {/* Add the Visual Mode Selector to the controls panel */}
              {isWebGLSupported && (
                <VisualModeSelector modes={visualModes} activeMode={visualMode} onModeChange={handleVisualModeChange} />
              )}

              <div className="grid grid-cols-2 gap-2">
                <ParameterDisplay
                  title="Filter Cutoff"
                  value={parameters.filterFrequency}
                  min={100}
                  max={8000}
                  paramType="frequency"
                />
                <ParameterDisplay
                  title="LFO Rate"
                  value={parameters.lfoRate}
                  min={0.1}
                  max={10}
                  paramType="frequency"
                />
                <ParameterDisplay
                  title="Reverb Mix"
                  value={parameters.reverbMix}
                  min={0}
                  max={1}
                  paramType="percentage"
                />
                <ParameterDisplay
                  title="Delay Time"
                  value={parameters.delayTime}
                  min={0.1}
                  max={0.7}
                  paramType="time"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleChordProgression}
                className={`w-full ${chordProgressionActive ? "bg-gray-700" : "bg-gray-800"}`}
              >
                <Music className="h-4 w-4 mr-2" />
                {chordProgressionActive ? "Disable Chord Progression" : "Enable Chord Progression"}
              </Button>

              <div className="text-xs text-gray-400 mt-2">
                <p>Move your hand horizontally to control LFO rate and delay time.</p>
                <p>Move your hand vertically to control filter cutoff and reverb amount.</p>
                <p>Bend your fingers to change notes within the current chord.</p>
              </div>
            </div>
          </div>
        )}

        {/* Overlay for when camera is off */}
        {!isCameraOn && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-80"
            style={{ zIndex: 3 }}
          >
            <p className="text-white mb-4">Camera is off</p>
            <Button onClick={startCamera} className="bg-blue-600 hover:bg-blue-700">
              Start Camera
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
          className="absolute bottom-4 left-4 flex space-x-3"
          style={{ zIndex: 50 }}
        >
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleMute}
            className="bg-gray-800 hover:bg-gray-700"
          >
            {isMuted ?
              <VolumeX className="h-5 w-5" /> :
              <Volume2 className="h-5 w-5" />
            }
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={toggleCamera}
            className="bg-gray-800 hover:bg-gray-700"
          >
            {isCameraOn ?
              <CameraOff className="h-5 w-5" /> :
              <Camera className="h-5 w-5" />
            }
          </Button>


          <Button
            variant="secondary"
            size="icon"
            onClick={toggleControls}
            className="bg-gray-800 hover:bg-gray-700"
          >
            <Sliders className="h-5 w-5" />
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
    </div>
  )
}
