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
        detectionConfidence: 0.7,
        maxHands: 1,
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
          frameRate: { ideal: 30, max: 60 },
        },
      })

      videoRef.current.srcObject = stream
      setIsCameraOn(true)
      setErrorMessage(null)

      initAudio()

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
    tracks.forEach((track) => track.stop())
    videoRef.current.srcObject = null
    setIsCameraOn(false)
    setHandDetected(false)
    stopAllSounds()
  }

  // Toggle camera
  const toggleCamera = () => {
    isCameraOn ? stopCamera() : startCamera()
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Reload the hand detection model
  const reloadHandDetection = async () => {
    if (handposeModelRef.current) {
      handposeModelRef.current = null
      setIsModelLoaded(false)
      stopAllSounds()
      await loadHandposeModel()
      setHandDetected(false)
      handConfidenceRef.current = 0
    }
  }

  // Map distance to frequency
  const mapDistanceToFrequency = (distance: number): number => {
    if (!isFinite(distance) || isNaN(distance)) return 440
    const minFreq = 220
    const maxFreq = 880
    const normalizedDistance = Math.min(Math.max(distance, 0), 200) / 200
    const pentatonic = [1, 1.2, 1.5, 1.8, 2]
    const baseFreq = minFreq + (1 - normalizedDistance) * (maxFreq - minFreq)
    const noteIndex = Math.floor(normalizedDistance * pentatonic.length)
    const safeIndex = Math.min(Math.max(noteIndex, 0), pentatonic.length - 1)
    const result = baseFreq * pentatonic[safeIndex]
    return isFinite(result) ? result : 440
  }

  // Create a more pleasant sound with multiple oscillators
  const createPleasantSound = (
    ctx: AudioContext,
    frequency: number,
    analyser: AnalyserNode | null,
  ): { oscillators: OscillatorNode[]; gain: GainNode } => {
    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.2
    if (analyser) masterGain.connect(analyser)
    else masterGain.connect(ctx.destination)

    const oscillators: OscillatorNode[] = []
    const osc1 = ctx.createOscillator()
    osc1.type = "triangle"
    osc1.frequency.value = frequency
    const osc1Gain = ctx.createGain()
    osc1Gain.gain.value = 0.6
    osc1.connect(osc1Gain)
    osc1Gain.connect(masterGain)
    osc1.start()
    oscillators.push(osc1)

    const osc2 = ctx.createOscillator()
    osc2.type = "sine"
    osc2.frequency.value = frequency * 1.005
    const osc2Gain = ctx.createGain()
    osc2Gain.gain.value = 0.4
    osc2.connect(osc2Gain)
    osc2Gain.connect(masterGain)
    osc2.start()
    oscillators.push(osc2)

    const osc3 = ctx.createOscillator()
    osc3.type = "sine"
    osc3.frequency.value = frequency * 2
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
    if (!isFinite(distance) || isNaN(distance)) distance = 100

    let fingerSound = fingerSoundsRef.current.get(fingerId)

    if (active && !fingerSound) {
      const frequency = mapDistanceToFrequency(distance)
      if (!isFinite(frequency) || isNaN(frequency)) return
      const { oscillators, gain } = createPleasantSound(audioContextRef.current!, frequency, analyserRef.current)
      fingerSound = { id: fingerId, active, frequency, oscillators, gain, position, distance }
      fingerSoundsRef.current.set(fingerId, fingerSound)
    } else if (active && fingerSound) {
      const frequency = mapDistanceToFrequency(distance)
      if (!isFinite(frequency) || isNaN(frequency)) return
      fingerSound.active = active
      fingerSound.frequency = frequency
      fingerSound.position = position
      fingerSound.distance = distance
      fingerSound.oscillators.forEach((osc, i) => {
        const freq = i === 0 ? frequency : i === 1 ? frequency * 1.005 : frequency * 2
        osc.frequency.setValueAtTime(freq, audioContextRef.current!.currentTime)
      })
    } else if (!active && fingerSound) {
      fingerSound.oscillators.forEach(osc => { osc.stop(); osc.disconnect() })
      fingerSound.gain.disconnect()
      fingerSoundsRef.current.delete(fingerId)
    }
  }

  // Stop all sounds
  const stopAllSounds = () => {
    fingerSoundsRef.current.forEach(sound => {
      sound.oscillators.forEach(osc => { osc.stop(); osc.disconnect() })
      sound.gain?.disconnect()
    })
    fingerSoundsRef.current.clear()
  }

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (!isMuted) {
      fingerSoundsRef.current.forEach(sound => { sound.gain!.gain.value = 0 })
    } else {
      fingerSoundsRef.current.forEach(sound => { sound.gain!.gain.value = 0.2 })
    }
  }

  // Update visualization parameters based on hand position
  const updateVisualizationParams = (landmarks: number[][], handScore: number) => {
    if (!landmarks.length) return
    const palm = landmarks[0]
    const thumbTip = landmarks[4]
    const indexTip = landmarks[8]
    const middleTip = landmarks[12]
    const ringTip = landmarks[16]
    const pinkyTip = landmarks[20]
    const handSpread = Math.hypot(thumbTip[0]-pinkyTip[0], thumbTip[1]-pinkyTip[1])
    const handHeight = Math.hypot(palm[0]-middleTip[0], palm[1]-middleTip[1])
    const rotation = Math.atan2(middleTip[1]-palm[1], middleTip[0]-palm[0])
    const confidenceFactor = Math.min(handScore, 1)
    const prev = visualParamsRef.current
    visualParamsRef.current = {
      rotation: prev.rotation*0.3 + rotation*0.7*confidenceFactor,
      scale: prev.scale*0.3 + (handHeight/100)*0.7*confidenceFactor,
      complexity: prev.complexity*0.3 + (3+handSpread/50)*0.7*confidenceFactor,
      intensity: prev.intensity*0.3 + (handHeight/200)*0.7*confidenceFactor,
      symmetry: prev.symmetry*0.3 + (3+Math.floor((handSpread/200)*5))*0.7*confidenceFactor,
    }
  }

  // Draw black and white visualization
  const drawVisualization = () => {
    const canvas = visualizationCanvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)
    ctx.fillStyle = "black"
    ctx.fillRect(0,0,canvas.width,canvas.height)
    const cx = canvas.width/2, cy = canvas.height/2
    const { rotation, scale, complexity, intensity, symmetry } = visualParamsRef.current
    ctx.save()
    ctx.translate(cx,cy)
    ctx.rotate(rotation)
    for (let layer=1; layer<=5; layer++) {
      const layerScale = scale*layer
      for (let i=0; i<symmetry; i++) {
        ctx.save()
        ctx.rotate((2*Math.PI/symmetry)*i)
        ctx.beginPath()
        for (let j=0; j<bufferLength; j+=Math.floor(bufferLength/complexity)) {
          const value = dataArray[j]/128
          const x = Math.cos(j*0.02)*value*100*layerScale
          const y = Math.sin(j*0.02)*value*100*layerScale
          j===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y)
        }
        ctx.closePath()
        const alpha = ((6-layer)/5)*intensity
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`
        ctx.lineWidth = 6-layer
        ctx.stroke()
        ctx.restore()
      }
    }
    const activeCount = fingerSoundsRef.current.size
    const coreSize = 20 + activeCount*10
    ctx.beginPath()
    ctx.arc(0,0,coreSize,0,2*Math.PI)
    ctx.fillStyle = "white"
    ctx.fill()
    if(activeCount>0){
      ctx.beginPath();ctx.arc(0,0,coreSize*0.7,0,2*Math.PI);ctx.fillStyle="black";ctx.fill()
      ctx.beginPath();ctx.arc(0,0,coreSize*0.4,0,2*Math.PI);ctx.fillStyle="white";ctx.fill()
    }
    ctx.restore()
    animationFrameRef.current = requestAnimationFrame(drawVisualization)
  }

  // Process video frame and detect hands
  const detectHands = async () => {
    if (!videoRef.current||!canvasRef.current||!handposeModelRef.current||!isCameraOn||videoRef.current.readyState!==4) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if(!ctx) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    try{
      const hands = await handposeModelRef.current.estimateHands(video)
      ctx.clearRect(0,0,canvas.width,canvas.height)
      ctx.drawImage(video,0,0,canvas.width,canvas.height)
      const now = Date.now()
      if(hands.length>0){
        setHandDetected(true)
        lastHandDetectionRef.current = now
        const handScore = hands[0].handInViewConfidence||0
        handConfidenceRef.current = handScore
        ctx.fillStyle = `rgba(0,255,0,${handScore})`
        ctx.fillRect(10,10,100*handScore,10)
        ctx.strokeStyle="white";ctx.strokeRect(10,10,100,10)
      } else {
        if(now-lastHandDetectionRef.current>1000){setHandDetected(false);handConfidenceRef.current=0}
        ctx.fillStyle="rgba(255,0,0,0.5)";ctx.fillRect(10,10,100*handConfidenceRef.current,10)
        ctx.strokeStyle="white";ctx.strokeRect(10,10,100,10)
      }
      hands.forEach(hand=>{
        const {landmarks, handInViewConfidence: handScore=0} = hand
        updateVisualizationParams(landmarks,handScore)
        const palm = landmarks[0]
        ctx.beginPath();ctx.arc(palm[0],palm[1],10,0,2*Math.PI);ctx.fillStyle="#FFFFFF";ctx.fill()
        (Object.keys(fingerLookupIndices) as Array<keyof typeof fingerLookupIndices>).forEach(name=>{
          const indices = fingerLookupIndices[name]
          const fingertip = landmarks[indices[indices.length-1]]
          let distance = Math.hypot(fingertip[0]-palm[0],fingertip[1]-palm[1])
          const validDistance = isFinite(distance)?distance:100
          const isExtended = validDistance>40
          updateFingerSound(name,isExtended,validDistance,{x:fingertip[0],y:fingertip[1]})
          if(isExtended){
            ctx.beginPath();ctx.moveTo(palm[0],palm[1]);ctx.lineTo(fingertip[0],fingertip[1]);ctx.strokeStyle="#FFFFFF";ctx.lineWidth=3;ctx.stroke()
            ctx.beginPath();ctx.arc(fingertip[0],fingertip[1],8,0,2*Math.PI);ctx.fillStyle="#FFFFFF";ctx.fill()
            ctx.fillStyle="white";ctx.font="12px Arial";ctx.fillText(name,fingertip[0]+10,fingertip[1])
          }
        })
        const connectJoints=(j1:number,j2:number)=>{ctx.beginPath();ctx.moveTo(landmarks[j1][0],landmarks[j1][1]);ctx.lineTo(landmarks[j2][0],landmarks[j2][1]);ctx.strokeStyle="rgba(255,255,255,0.7)";ctx.lineWidth=2;ctx.stroke()}
        connectJoints(0,1);connectJoints(0,5);connectJoints(0,9);connectJoints(0,13);connectJoints(0,17)
        for(let i=1;i<4;i++){connectJoints(i,i+1);connectJoints(i+4,i+5);connectJoints(i+8,i+9);connectJoints(i+12,i+13);connectJoints(i+16,i+17)}
        for(let i=0;i<landmarks.length;i++){const p=landmarks[i];ctx.beginPath();ctx.arc(p[0],p[1],3,0,2*Math.PI);ctx.fillStyle="rgba(255,255,255,0.5)";ctx.fill()}
      })
      if(hands.length===0) stopAllSounds()
    } catch(error) {
      console.error("Error during hand detection:",error)
    }
    requestAnimationFrame(detectHands)
  }

  // Initialize camera and model on component mount
  useEffect(()=>{
    if(!isModelLoaded&&!handposeModelRef.current) loadHandposeModel()
    if(visualizationCanvasRef.current&&analyserRef.current) drawVisualization()
    return ()=>{stopCamera(); stopAllSounds(); if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); if(audioContextRef.current&&audioContextRef.current.state!=="closed") audioContextRef.current.close()}
  },[])

  // Start hand detection when camera and model are ready
  useEffect(()=>{ if(isCameraOn&&isModelLoaded&&handposeModelRef.current) detectHands() },[isCameraOn,isModelLoaded])

  // Start visualization when audio is initialized
  useEffect(()=>{ if(isAudioInitialized&&analyserRef.current) drawVisualization(); return ()=>{ if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)} },[isAudioInitialized])

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div className={`relative ${isFullscreen ? "fixed inset-0 z-50 bg-black" : "w-full rounded-lg overflow-hidden shadow-xl border border-gray-700"}`} style={{ height: isFullscreen ? "100vh" : "60vh", minHeight: "300px" }}>
        <video ref={videoRef} className="hidden" autoPlay playsInline />
        <canvas ref={visualizationCanvasRef} className="absolute top-0 left-0 w-full h-full touch-none select-none" style={{ background: "black", zIndex: 1 }} />
        <div className={`absolute ${isFullscreen ? "bottom-8 right-8" : "bottom-4 right-4"} touch-none select-none`} style={{ width: isFullscreen ? "250px" : "150px", height: isFullscreen ? "187px" : "112px", zIndex: 2, border: "2px solid white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)" }}>        <canvas ref={canvasRef} className="w-full h-full touch-none select-none" style={{ background: "#1a1a2e" }} />        <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold ${handDetected ? "bg-green-500" : "bg-red-500"}`}>{handDetected ? "Hand ✓" : "No Hand"}</div></div>
        {!isCameraOn && <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-80" style={{ zIndex: 3 }}><p className="text-white mb-4">Kamera ist ausgeschaltet</p><Button onClick={startCamera} className="bg-blue-600 hover:bg-blue-700">Kamera starten</Button></div>}
        {errorMessage && <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center" style={{ zIndex: 4 }}>{errorMessage}</div>}
        <div className={`absolute ${isFullscreen ? "bottom-8 left-8" : "bottom-4 left-4"} flex space-x-2`} style={{ zIndex: 3 }}>
          <Button variant="secondary" size="icon" onClick={toggleMute} className="bg-gray-800 hover:bg-gray-700">{isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</Button>
          <Button variant="secondary" size="icon" onClick={toggleCamera} className="bg-gray-800 hover:bg-gray-700">{isCameraOn ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}</Button>
          <Button variant="secondary" size="icon" onClick={toggleFullscreen} className="bg-gray-800 hover:bg-gray-700">{isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}</Button>
          <Button variant="secondary" size="icon" onClick={reloadHandDetection} className="bg-gray-800 hover:bg-gray-700"><RefreshCw className="h-5 w-5" /></Button>
        </div>
      </div>
      {!isFullscreen && <div className="mt-6 text-gray-300 text-sm"><p className="mb-2"><strong>Anleitung:</strong></p><ul className="list-disc pl-5 space-y-1"><li>Positioniere deine Hand vor der Kamera</li><li>Strecke deine Finger aus, um Klänge zu erzeugen</li><li>Jeder Finger erzeugt einen einzigartigen Ton</li><li>Der Abstand zwischen Fingerspitze und Handfläche steuert die Tonhöhe</li><li>Die Visualisierung reagiert auf deine Handbewegungen</li><li>Klicke auf <Maximize className="inline h-4 w-4" /> für Vollbildmodus</li><li>Klicke auf <RefreshCw className="inline h-4 w-4" /> um die Handerkennung neu zu starten</li></ul></div>}
    </div>
  )
}
