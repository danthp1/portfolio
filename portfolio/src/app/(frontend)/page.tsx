"use client"
import { motion } from "framer-motion"
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ScrollControls, Scroll, PerspectiveCamera, useProgress } from '@react-three/drei'
import Eight from "@/components/animata/bento-grid/eight"
import { Features } from "@/components/animata/feature/feature-10"
import Feature89 from "@/components/animata/calltoaction/call-to-action"
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib'
import usePlayerStore from '@/store/usePlayerStore'
import LoadingScreen from '@/components/LoadingScreen'
import {Github, Hexagon, Twitter} from "lucide-react";
import {Footer} from "@/Footer/Component";




/* ---------- Dev Mode UI for editing camera path points ---------------- */
function DevModeUI() {
  const { devMode, setDevMode, cameraPathPoints, updateCameraPathPoint, addCameraPathPoint, deleteCameraPathPoint } = usePlayerStore()
  const [pointsAsString, setPointsAsString] = useState('')
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)
  const [editingPoint, setEditingPoint] = useState<{ x: number, y: number, z: number } | null>(null)
  const [newPoint, setNewPoint] = useState<{ x: number, y: number, z: number }>({ x: 0, y: 0, z: 0 })

  // Update points as string when camera path points change
  useEffect(() => {
    const pointsString = JSON.stringify(cameraPathPoints, null, 2)
    setPointsAsString(pointsString)
  }, [cameraPathPoints])

  // Style for the dev mode panel
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: '15px',
    borderRadius: '8px',
    color: 'white',
    zIndex: 1000,
    width: '350px',
    maxHeight: '80vh',
    overflowY: 'auto',
    fontFamily: 'Arial, sans-serif',
  }

  const toggleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
  }

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#4CAF50',
    border: 'none',
    color: 'white',
    padding: '8px 16px',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'inline-block',
    fontSize: '14px',
    margin: '4px 2px',
    cursor: 'pointer',
    borderRadius: '4px',
  }

  const copyButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#2196F3',
  }

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    height: '150px',
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '8px',
    fontFamily: 'monospace',
    fontSize: '12px',
    marginBottom: '10px',
  }

  const pointListStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  }

  const pointItemStyle: React.CSSProperties = {
    padding: '8px',
    margin: '4px 0',
    backgroundColor: '#333',
    borderRadius: '4px',
    cursor: 'pointer',
  }

  const selectedPointStyle: React.CSSProperties = {
    ...pointItemStyle,
    backgroundColor: '#555',
    border: '1px solid #888',
  }

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
  }

  const inputLabelStyle: React.CSSProperties = {
    width: '20px',
    marginRight: '8px',
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    backgroundColor: '#444',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '4px 8px',
  }

  // Handle point selection
  const handlePointSelect = (index: number) => {
    setSelectedPointIndex(index)
    setEditingPoint({ ...cameraPathPoints[index] })
  }

  // Handle point update
  const handlePointUpdate = () => {
    if (selectedPointIndex !== null && editingPoint !== null) {
      updateCameraPathPoint(selectedPointIndex, editingPoint)
    }
  }

  // Handle coordinate change
  const handleCoordinateChange = (coord: 'x' | 'y' | 'z', value: string) => {
    if (editingPoint) {
      setEditingPoint({
        ...editingPoint,
        [coord]: parseFloat(value) || 0
      })
    }
  }

  // Handle new point coordinate change
  const handleNewPointChange = (coord: 'x' | 'y' | 'z', value: string) => {
    setNewPoint({
      ...newPoint,
      [coord]: parseFloat(value) || 0
    })
  }

  // Handle adding a new point
  const handleAddPoint = () => {
    addCameraPathPoint(newPoint)
    // Reset new point values
    setNewPoint({ x: 0, y: 0, z: 0 })
  }

  // Handle deleting a point
  const handleDeletePoint = () => {
    if (selectedPointIndex !== null) {
      deleteCameraPathPoint(selectedPointIndex)
      setSelectedPointIndex(null)
      setEditingPoint(null)
    }
  }

  // Copy points to clipboard
  const handleCopyPoints = () => {
    navigator.clipboard.writeText(pointsAsString)
      .then(() => {
        alert('Camera path points copied to clipboard!')
      })
      .catch(err => {
        console.error('Failed to copy points: ', err)
      })
  }

  if (!devMode) return null

  return (
    <div style={panelStyle}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Dev Mode - Camera Path Editor</h3>

      <div style={toggleStyle}>
        <label style={{ marginRight: '10px' }}>Dev Mode:</label>
        <input
          type="checkbox"
          checked={devMode}
          onChange={(e) => setDevMode(e.target.checked)}
        />
      </div>

      <h4 style={{ margin: '10px 0', fontSize: '14px' }}>Camera Path Points</h4>

      <div>
        <textarea
          style={textareaStyle}
          value={pointsAsString}
          readOnly
        />
        <button
          style={copyButtonStyle}
          onClick={handleCopyPoints}
        >
          Copy Points
        </button>
      </div>

      <h4 style={{ margin: '15px 0 10px', fontSize: '14px' }}>Edit Points</h4>

      <ul style={pointListStyle}>
        {cameraPathPoints.map((point, index) => (
          <li
            key={index}
            style={selectedPointIndex === index ? selectedPointStyle : pointItemStyle}
            onClick={() => handlePointSelect(index)}
          >
            Point {index + 1}: ({point.x.toFixed(2)}, {point.y.toFixed(2)}, {point.z.toFixed(2)})
          </li>
        ))}
      </ul>

      {selectedPointIndex !== null && editingPoint && (
        <div style={{ marginTop: '15px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '14px' }}>
            Editing Point {selectedPointIndex + 1}
          </h4>

          <div style={inputGroupStyle}>
            <label style={inputLabelStyle}>X:</label>
            <input
              type="number"
              style={inputStyle}
              value={editingPoint.x}
              onChange={(e) => handleCoordinateChange('x', e.target.value)}
              step="0.1"
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={inputLabelStyle}>Y:</label>
            <input
              type="number"
              style={inputStyle}
              value={editingPoint.y}
              onChange={(e) => handleCoordinateChange('y', e.target.value)}
              step="0.1"
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={inputLabelStyle}>Z:</label>
            <input
              type="number"
              style={inputStyle}
              value={editingPoint.z}
              onChange={(e) => handleCoordinateChange('z', e.target.value)}
              step="0.1"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              style={buttonStyle}
              onClick={handlePointUpdate}
            >
              Update Point
            </button>

            <button
              style={{ ...buttonStyle, backgroundColor: '#f44336' }}
              onClick={handleDeletePoint}
            >
              Delete Point
            </button>
          </div>
        </div>
      )}

      {/* Add New Point Section */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #555', paddingTop: '15px' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: '14px' }}>Add New Point</h4>

        <div style={inputGroupStyle}>
          <label style={inputLabelStyle}>X:</label>
          <input
            type="number"
            style={inputStyle}
            value={newPoint.x}
            onChange={(e) => handleNewPointChange('x', e.target.value)}
            step="0.1"
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={inputLabelStyle}>Y:</label>
          <input
            type="number"
            style={inputStyle}
            value={newPoint.y}
            onChange={(e) => handleNewPointChange('y', e.target.value)}
            step="0.1"
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={inputLabelStyle}>Z:</label>
          <input
            type="number"
            style={inputStyle}
            value={newPoint.z}
            onChange={(e) => handleNewPointChange('z', e.target.value)}
            step="0.1"
          />
        </div>

        <button
          style={{ ...buttonStyle, backgroundColor: '#2196F3', marginTop: '8px' }}
          onClick={handleAddPoint}
        >
          Add New Point
        </button>
      </div>
    </div>
  )
}

/* ---------- Keyboard Controls for Moving Selected Person ---------------- */
function Controls() {
  const { selected, setMoveDir } = usePlayerStore()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (selected === null) return

      // Only allow one direction at a time (no diagonals)
      // Priority: Up > Down > Left > Right
      let x = 0, z = 0

      if (e.key === 'ArrowUp' || e.key === 'w') {
        z = -1 // Front direction
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        z = 1  // Back direction
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        x = -1 // Left side
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        x = 1  // Right side
      }

      setMoveDir({ x, z })
    }

    const onKeyUp = (e: KeyboardEvent) => {
      // Only reset the direction that was released
      if (selected === null) return

      const currentDir = usePlayerStore.getState().moveDir
      let x = currentDir.x, z = currentDir.z

      if ((e.key === 'ArrowUp' || e.key === 'w') && z === -1) z = 0
      if ((e.key === 'ArrowDown' || e.key === 's') && z === 1) z = 0
      if ((e.key === 'ArrowLeft' || e.key === 'a') && x === -1) x = 0
      if ((e.key === 'ArrowRight' || e.key === 'd') && x === 1) x = 0

      setMoveDir({ x, z })
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [selected, setMoveDir])

  return null
}

/* ---------- Intense Spotlight & Glowing Screen ----------------------------- */
export function Screen({ projectionSrc = null }) {
  useEffect(() => {
    RectAreaLightUniformsLib.init()
  }, [])

  // Create a texture from SVG if provided
  const texture = useMemo(() => {
    if (!projectionSrc) return null
    const tex = new THREE.TextureLoader().load(projectionSrc)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    return tex
  }, [projectionSrc])

  return (
    <>
      <rectAreaLight
        args={[0xeeeeff, 120, 22, 18]}
        position={[19, 0, 2.5]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <mesh position={[19, 0, 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[22, 17.75]} />
        <meshStandardMaterial
          color="#e8f0ff"
          emissive="#aaddff"
          emissiveIntensity={12}
          metalness={0}
          roughness={1}
          map={texture}
        />
      </mesh>
    </>
  )
}

export function Room({ wallTextures = [null, null, null, null, null] }: RoomProps) {
  const size = 40
  const height = 20
  const floorDepth = 20

  // 1. Wand-/Boden-Texturen laden (SVG o.ä.)
  const textures = useMemo(() => {
    return wallTextures.map(src => {
      if (!src) return null
      const tex = new THREE.TextureLoader().load(src)
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      // optional: tex.repeat.set(2, 2)
      return tex
    })
  }, [wallTextures])

  // 2. Deine nahtlose Glas-Diffuse-Map
  const glassDiffuse = useLoader(
    THREE.TextureLoader,
    '/glass-diffuse.jpg'
  )
  // 3. Deine Glas-Bump-Map
  const glassBump = useLoader(
    THREE.TextureLoader,
    '/glass-bump.jpg'
  )

  // 4. Wrap & Repeat einstellen
  useMemo(() => {
    [glassDiffuse, glassBump].forEach(tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(4, 4)          // Muster 4×4 wiederholen
    })
  }, [glassDiffuse, glassBump])

  // 5. Materiale definieren
  const baseFloorMat = useMemo(() => (
    <meshStandardMaterial
      color="#ffffff"
      roughness={0.3}
      emissive="#D8D8D8"
      emissiveIntensity={0.5}
      map={textures[0] ?? undefined}
    />
  ), [textures])

  const glassFloorMat = useMemo(() => (
    <meshPhysicalMaterial
      color="#ffffff"
      roughness={0.1}
      metalness={0.1}
      transmission={0.9}
      thickness={0.5}
      envMapIntensity={1}
      clearcoat={1}
      clearcoatRoughness={0.1}
      transparent
      opacity={0.3}
      bumpMap={glassBump}       // deine Bump-Map
      bumpScale={0.1}          // Stärke der Unebenheiten
    />
  ), [glassBump])

  const createWallMat = (idx: number) => (
    <meshStandardMaterial
      color="#ffffff"
      roughness={0.3}
      emissive="#D8D8D8"
      emissiveIntensity={0.6}
      map={textures[idx] ?? undefined}
    />
  )

  return (
    <group>
      {/* Boden-Block */}
      <mesh position={[0, -floorDepth / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[size, size, floorDepth]} />
        {baseFloorMat}
      </mesh>

      {/* indirektes Licht unter dem Boden */}
      <pointLight
        position={[0, -floorDepth - 1, 0]}
        intensity={5}
        color="#559EFC"
        distance={20}
        decay={2}
      />

      {/* Glas-Plane oben */}
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        {glassFloorMat}
      </mesh>

      {/* Wände */}
      {[
        { pos: [0, height / 2, -size / 2], rot: [0, 0, 0], idx: 1 },
        { pos: [0, height / 2, size / 2], rot: [0, Math.PI, 0], idx: 2 },
        { pos: [-size / 2, height / 2, 0], rot: [0, Math.PI / 2, 0], idx: 3 },
        { pos: [size / 2, height / 2, 0], rot: [0, -Math.PI / 2, 0], idx: 4 }
      ].map((w, i) => (
        <mesh key={i} position={w.pos as [number, number, number]} rotation={w.rot as [number, number, number]} receiveShadow>
          <boxGeometry args={[size, height, 0.8]} />
          {createWallMat(w.idx)}
        </mesh>
      ))}
    </group>
  )
}

/* ---------- 2D Sketch Characters with States ---------------- */
type PersonProps = {
  idx: 0 | 1
}

export function Person({ idx }: PersonProps) {
  const ref = useRef<THREE.Mesh>(null!)
  const { selected, setSelected, moveDir, movementSpeed, animationSpeed } = usePlayerStore()
  const isMe = selected === idx
  const { camera } = useThree()

  // Animation frame counter and direction state
  const [frameIndex, setFrameIndex] = useState(1)
  const [direction, setDirection] = useState<'front' | 'back' | 'side'>('front')
  const [lastDirection, setLastDirection] = useState<'front' | 'back' | 'side'>('front')
  const [loadingError, setLoadingError] = useState(false)

  // Error handler for texture loading
  const onError = (error: Error | string) => {
    console.error('Failed to load texture:', error)
    setLoadingError(true)
  }

  // Create fallback texture for error cases
  const fallbackTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#FF0000'
      ctx.fillRect(0, 0, 64, 128)
    }
    return new THREE.CanvasTexture(canvas)
  }, [])

  // Load idle textures at component level
  const idleFrontTexture = useLoader(
    THREE.TextureLoader,
    `character-${idx}\\idle\\idle_front.png`,
    undefined,
    onError
  )
  const idleBackTexture = useLoader(
    THREE.TextureLoader,
    `character-${idx}\\idle\\idle_back.png`,
    undefined,
    onError
  )
  const idleSideTexture = useLoader(
    THREE.TextureLoader,
    `character-${idx}\\idle\\idle_side.png`,
    undefined,
    onError
  )

  // Load walk animation frames - load each texture individually to avoid hooks in loops
  const walkFront1 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_front_1.png`, undefined, onError)
  const walkFront2 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_front_2.png`, undefined, onError)
  const walkFront3 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_front_3.png`, undefined, onError)
  const walkFront4 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_front_4.png`, undefined, onError)
  const walkFront5 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_front_5.png`, undefined, onError)
  const walkFront6 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_front_6.png`, undefined, onError)
  const walkFront7 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_front_7.png`, undefined, onError)
  const walkFront8 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_front_8.png`, undefined, onError)

  const walkBack1 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_back_1.png`, undefined, onError)
  const walkBack2 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_back_2.png`, undefined, onError)
  const walkBack3 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_back_3.png`, undefined, onError)
  const walkBack4 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_back_4.png`, undefined, onError)
  const walkBack5 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_back_5.png`, undefined, onError)
  const walkBack6 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_back_6.png`, undefined, onError)
  const walkBack7 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_back_7.png`, undefined, onError)
  const walkBack8 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_back_8.png`, undefined, onError)

  const walkSide1 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_side_1.png`, undefined, onError)
  const walkSide2 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_side_2.png`, undefined, onError)
  const walkSide3 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_side_3.png`, undefined, onError)
  const walkSide4 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_side_4.png`, undefined, onError)
  const walkSide5 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_side_5.png`, undefined, onError)
  const walkSide6 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_side_6.png`, undefined, onError)
  const walkSide7 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_side_7.png`, undefined, onError)
  const walkSide8 = useLoader(THREE.TextureLoader, `character-${idx}\\walk\\walk_side_8.png`, undefined, onError)

  // Create the texture arrays using useMemo
  const walkFrontTextures = useMemo(() => [
    walkFront1, walkFront2, walkFront3, walkFront4,
    walkFront5, walkFront6, walkFront7, walkFront8
  ], [walkFront1, walkFront2, walkFront3, walkFront4,
      walkFront5, walkFront6, walkFront7, walkFront8])

  const walkBackTextures = useMemo(() => [
    walkBack1, walkBack2, walkBack3, walkBack4,
    walkBack5, walkBack6, walkBack7, walkBack8
  ], [walkBack1, walkBack2, walkBack3, walkBack4,
      walkBack5, walkBack6, walkBack7, walkBack8])

  const walkSideTextures = useMemo(() => [
    walkSide1, walkSide2, walkSide3, walkSide4,
    walkSide5, walkSide6, walkSide7, walkSide8
  ], [walkSide1, walkSide2, walkSide3, walkSide4,
      walkSide5, walkSide6, walkSide7, walkSide8])

  // Organize textures
  const textures = useMemo(() => {
    return {
      idle: {
        front: loadingError ? fallbackTexture : idleFrontTexture,
        back: loadingError ? fallbackTexture : idleBackTexture,
        side: loadingError ? fallbackTexture : idleSideTexture
      },
      walk: {
        front: loadingError ? Array(8).fill(fallbackTexture) : walkFrontTextures,
        back: loadingError ? Array(8).fill(fallbackTexture) : walkBackTextures,
        side: loadingError ? Array(8).fill(fallbackTexture) : walkSideTextures
      }
    }
  }, [
    idleFrontTexture, idleBackTexture, idleSideTexture,
    walkFrontTextures, walkBackTextures, walkSideTextures,
    loadingError, fallbackTexture
  ])

  // Definiere Farben für jeden State
  const stateColors = {
    idle: isMe ? '#d8d8d8' : '#f6f6f6',
    walk: isMe ? '#c8c7c7' : '#ffffff'
  }

  // State-Management für Animation
  const [state, setState] = useState<'idle' | 'walk'>('idle')

  // Vergib einen eindeutigen Namen zum Kollisions-Check
  useEffect(() => {
    if (ref.current) ref.current.name = `person-${idx}`
  }, [idx])

  // Animation loop to cycle through frames
  useEffect(() => {
    if (state !== 'walk') return

    const animationInterval = setInterval(() => {
      setFrameIndex(prev => (prev % 8) + 1) // Loop from 1 to 8
    }, animationSpeed) // Use configurable animation speed from the store

    return () => clearInterval(animationInterval)
  }, [state, animationSpeed])

  // Track which way the character is facing for side view (left or right)
  const [facingLeft, setFacingLeft] = useState(false)

  // Update state based on moveDir and camera angle
  useEffect(() => {
    if (!isMe) {
      setState('idle')
      return
    }

    const speed = Math.hypot(moveDir.x, moveDir.z)

    if (speed === 0) {
      setState('idle')
    } else {
      setState('walk')

      // Get the current camera angle to determine visual direction
      // We need to calculate this here to match what's happening in useFrame
      const cameraPos = camera.position
      const characterPos = ref.current?.position || new THREE.Vector3()

      const directionToCamera = new THREE.Vector3(
        cameraPos.x - characterPos.x,
        cameraPos.y - characterPos.y,
        cameraPos.z - characterPos.z
      ).normalize()

      const _cameraAngle = Math.atan2(directionToCamera.x, directionToCamera.z)

      // Determine visual direction based on movement and camera angle
      if (moveDir.z !== 0 || moveDir.x !== 0) {
        // Calculate the visual movement direction relative to the camera
        let visualDirection: 'front' | 'back' | 'side' = 'front'
        let isLeft = false

        // For W key (forward) - character is moving away from camera
        if (moveDir.z < 0) {
          visualDirection = 'back'
        }
        // For S key (backward) - character is moving toward camera
        else if (moveDir.z > 0) {
          visualDirection = 'front'
        }
        // For A key (left) - character is moving to the left relative to camera
        else if (moveDir.x < 0) {
          visualDirection = 'side'
          isLeft = true
        }
        // For D key (right) - character is moving to the right relative to camera
        else if (moveDir.x > 0) {
          visualDirection = 'side'
          isLeft = false
        }

        setDirection(visualDirection)
        setLastDirection(visualDirection)
        setFacingLeft(isLeft)
      }
    }
  }, [isMe, moveDir, camera.position])

  // Bewege die Mesh pro Frame
  useFrame((_, delta) => {
    if (!isMe) return

    // Calculate rotation to make the plane fully face the camera (true billboarding)
    // This ensures the character sprite is always fully visible to the camera
    const directionToCamera = new THREE.Vector3(
      camera.position.x - ref.current.position.x,
      camera.position.y - ref.current.position.y,
      camera.position.z - ref.current.position.z
    ).normalize()

    // Calculate the angle to make the plane face directly toward the camera
    const angle = Math.atan2(directionToCamera.x, directionToCamera.z)

    // Apply the rotation to make the character fully face the camera
    ref.current.rotation.y = angle

    // Calculate movement direction relative to the camera view
    // This ensures the character moves in the direction it appears to be facing
    const moveVector = new THREE.Vector3()

    // Create a movement vector in camera-relative space
    if (moveDir.z !== 0 || moveDir.x !== 0) {
      // Forward/backward movement (relative to camera view)
      if (moveDir.z < 0) { // Forward (W key)
        moveVector.z = -Math.cos(angle)
        moveVector.x = -Math.sin(angle)
      } else if (moveDir.z > 0) { // Backward (S key)
        moveVector.z = Math.cos(angle)
        moveVector.x = Math.sin(angle)
      }

      // Left/right movement (relative to camera view)
      if (moveDir.x < 0) { // Left (A key)
        moveVector.z = Math.sin(angle)
        moveVector.x = -Math.cos(angle)
      } else if (moveDir.x > 0) { // Right (D key)
        moveVector.z = -Math.sin(angle)
        moveVector.x = Math.cos(angle)
      }
    }

    // Use the configurable movement speed from the store
    const speed = movementSpeed
    const nextPos = ref.current.position.clone().add(moveVector.multiplyScalar(speed * delta))

    // Screen-Bounds
    const bound = 9.5
    nextPos.x = THREE.MathUtils.clamp(nextPos.x, -bound, bound)
    nextPos.z = THREE.MathUtils.clamp(nextPos.z, -bound, bound)

    // Kollisions-Check gegen andere Person
    const other = ref.current.parent!.getObjectByName(`person-${1 - idx}`) as THREE.Mesh
    if (!other || nextPos.distanceTo(other.position) >= 1) {
      ref.current.position.copy(nextPos)
    }

    // This section has been moved to the beginning of useFrame
  })

  // Get the current texture based on state, direction, and frame
  const getCurrentTexture = () => {
    if (state === 'idle') {
      // Use the idle texture corresponding to the last direction
      return textures.idle[lastDirection]
    }


    return textures.walk[direction][frameIndex - 1]
  }

  return (
    <mesh
      ref={ref}
      position={[5 - idx * 2, 2, idx === 0 ? -1 : 1]}
      onClick={() => setSelected(idx)}
      castShadow
      scale={[direction === 'side' && facingLeft ? -1 : 1, 1, 1]} // Flip horizontally if facing left
    >
      <planeGeometry args={[1.2, 3]} />
      <meshBasicMaterial
        color={stateColors[state]}
        map={getCurrentTexture()}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/* ---------- Camera Path Visualizer for Dev Mode ----------------------------- */
function CameraPathVisualizer() {
  const devMode = usePlayerStore(state => state.devMode)
  const cameraPathPoints = usePlayerStore(state => state.cameraPathPoints)
  const selectedPointIndex = useRef<number | null>(null)

  // Don't render anything if dev mode is disabled
  if (!devMode) return null

  return (
    <group>
      {/* Render a line connecting all points */}
      <line>
        <bufferGeometry attach="geometry">
          <bufferAttribute
            attach="attributes-position"
            count={cameraPathPoints.length}
            array={Float32Array.from(cameraPathPoints.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial attach="material" color="#ffff00" linewidth={2} />
      </line>

      {/* Render a sphere at each point */}
      {cameraPathPoints.map((point, index) => (
        <mesh
          key={index}
          position={[point.x, point.y, point.z]}
          onClick={(e) => {
            e.stopPropagation()
            selectedPointIndex.current = index
            // You could add functionality here to select a point for editing
          }}
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- Rail Camera ----------------------------- */
function RailCam() {
  const { camera, size, scene } = useThree()
  const lastY = useRef(0)
  const vel = useRef(0)
  const autoc = useRef(false)
  // Get camera path points from store
  const cameraPathPoints = usePlayerStore(state => state.cameraPathPoints)
  // Add a manual scroll position ref to control with arrow keys and wheel
  const manualScrollY = useRef(0)

  useEffect(() => {
    // Handle scroll events
    const handleScroll = (e) => {
      // Note: We don't prevent default for scroll events as it's not reliable in all browsers
      // and we want the scrollbar to work normally

      // Update velocity and last Y position
      const y = window.scrollY
      vel.current = y - lastY.current
      lastY.current = y

      // Reset manualScrollY to ensure we use the standard scrollbar
      manualScrollY.current = 0
    }

    // Handle wheel events
    const handleWheel = (e) => {
      e.preventDefault()    // passive: false vorausgesetzt
      // die eigentliche Seiten–Bewegung:
      window.scrollBy({ top: e.deltaY, behavior: 'auto' })

      // für Smoothness weiter die Velocity setzen
      vel.current = e.deltaY * 0.1
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)

    // -- Keydown-Handler für ↑/↓ --
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const amount = 100 // px pro Tastendruck, anpassen nach Geschmack
        window.scrollBy({
          top: e.key === 'ArrowDown' ? amount : -amount,
          behavior: 'auto'
        })
      }
      // Links/Rechts weiter, wie gehabt…
    }


    // Add event listeners
    // Using passive: true for wheel events since we're not preventing default
    // This improves scrolling performance
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('wheel', handleWheel)
    window.addEventListener('keydown', handleKeyDown)

    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [size.height])

  // Convert the points from the store to THREE.Vector3 objects
  const curve = useMemo(() => new THREE.CatmullRomCurve3(
    cameraPathPoints.map(point => new THREE.Vector3(point.x, point.y, point.z))
  ), [cameraPathPoints])

  useFrame(()=>{
    const vh = size.height
    const total = vh*4 // Increased to match our 5 pages in ScrollControls

    // Always use window.scrollY for scrolling to ensure standard scrollbar functionality
    // This ensures we use the standard scrollbar for wheel events and up/down arrow keys
    const scrollPosition = window.scrollY
    const t = Math.min(scrollPosition/total,1)
    const smooth = Math.min(0.1+Math.abs(vel.current)*0.0003,0.2)
    const p = curve.getPointAt(t)
    camera.position.lerp(p,smooth)
    ;[0,1].forEach(i=>{
      const p = scene.getObjectByName(`person-${i}`)
      if (!p) return
      const dist = camera.position.distanceTo((p as THREE.Mesh).position)
      const min = 2
      if (dist < min) {
        const dir = camera.position.clone().sub((p as THREE.Mesh).position).normalize()
        camera.position.add(dir.multiplyScalar(min-dist))
      }
    })
    camera.fov = THREE.MathUtils.lerp(45,12,t)
    camera.updateProjectionMatrix()
    // Adjust lookAt target based on progress to ensure camera points at screen
    const lookAtY = THREE.MathUtils.lerp(0, 10, t) // Keep y at 0 for now

    camera.lookAt(new THREE.Vector3(19, lookAtY, 2))
    const cont = document.getElementById('canvas-container')!
    if (t>=0.95) {
      cont.style.backgroundColor = '#000'
      cont.style.opacity = '1'
      if (!autoc.current) {
        autoc.current = true;
        // Update window scroll
        window.scrollTo({ top: total+10, behavior: 'smooth' })
      }
    } else if (autoc.current) {
      autoc.current = false
      cont.style.backgroundColor = ''
      // Update window scroll
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  })

  return null
}

/* ---------- Main Scene -------------------- */
function RoomScene() {
  const { scene } = useThree()
  const [currentProjection, _setCurrentProjection] = useState('/favicon.svg') // Default SVG

  // Wall textures - SVG for each wall (floor, front, back, left, right)
  const [wallTextures, _setWallTextures] = useState([
    '/text.svg', // Floor
    '/text.svg', // Front wall
    '/text.svg', // Back wall
    '/text.svg', // Left wall
    '/text.svg'  // Right wall
  ])

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#c2c3c6', 0.03)
    scene.background = new THREE.Color('#ffffff')
  },[scene])

  return (
    <>
      <Room wallTextures={wallTextures} />
      <Screen projectionSrc={currentProjection} />
        <Person idx={0} />
        <Person idx={1} />

      <ambientLight intensity={0.4} color="#92aad8" />



    </>
  )
}

/* ---------- Loading Component --------------------------------- */
function LoadingComponent() {
  const { progress, active: _active } = useProgress()
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 1000
    }}>
      <LoadingScreen progress={Math.round(progress)} />
    </div>
  )
}

/* ---------- Page Component --------------------------------- */
export default function Page() {
  const [mounted, setMounted] = useState(false)
  const [roomLoaded, setRoomLoaded] = useState(false)
  const { devMode, setDevMode } = usePlayerStore()
  const { progress } = useProgress()

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false)
  }, [])

  // Track when the loading is complete
  useEffect(() => {
    if (progress >= 100) {
      // Add a small delay to ensure the room is fully rendered
      const timer = setTimeout(() => {
        setRoomLoaded(true)
      }, 2500) // Slightly longer than the buffer in LoadingScreen

      return () => clearTimeout(timer)
    }
  }, [progress])

  // Dein Lorem-Ipsum-Text
  const lines = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse.",
    "Cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.",
    "Sunt in culpa qui officia deserunt mollit anim id est laborum."
  ]

  useEffect(() => {
    if (!mounted) return
    const style = document.createElement('style')
    style.innerHTML = `body{margin:0;padding:0;overflow-x:hidden;background:#000;transition:background-color .5s;}html,body{width:100%;height:100%;}canvas{display:block;transition:opacity .5s;}#canvas-container{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:10;}`
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  },[mounted])

  if (!mounted) return null

  return (
    <>
      {/* Sidebar mit endlosem, vertikal scrollendem Text - nur anzeigen, wenn der Raum geladen ist */}
      {roomLoaded && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "20rem",
            height: "100vh",
            overflow: "hidden",
            zIndex: 15,
          }}
        >
          <motion.div
            style={{
              display: "flex",
              flexDirection: "column",
              writingMode: "vertical-rl",
              textOrientation: "upright",
              fontSize: 18,
              color: "#386bff",
              fontFamily: "sans-serif",
              lineHeight: 1.5,
            }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              y: ["0%", "-50%"]
            }}
            transition={{
              opacity: { duration: 0.5, delay: 0.2 },
              y: {
                duration: 10,
                ease: "linear",
                repeat: Infinity,
              }
            }}
          >
            {/** wir rendern den Block zweimal **/}
            {[0, 1].map(rep => (
              <div key={rep}>
                {lines.map((txt, i) => (
                  <p key={i} className={"font-bold"} style={{ margin: 0, padding: "0.5rem 0" }}>
                    {txt}
                  </p>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      )}



      <div id="canvas-container">
        <Suspense fallback={<LoadingComponent />} >
          <Canvas gl={{ antialias: true }} shadows>
            <PerspectiveCamera makeDefault fov={45} position={[-12,2,-12]} />

            <RailCam />
            <Controls />
            <CameraPathVisualizer />
            <ScrollControls pages={2} distance={1.5} damping={0.3}>
              <Scroll><RoomScene /></Scroll>
              <Scroll html>
              </Scroll>
            </ScrollControls>
          </Canvas>
        </Suspense>
      </div>
      <div style={{ height: '450vh' }} />
      <div className={"px-40"} style={{ position: 'relative', zIndex:20, background:'#fff', minHeight:'300vh', width: '100%' }}>
        <Features />
        <Feature89 />
        <Footer
          logo={<Hexagon className="h-10 w-10" />}
          brandName="Awesome Corp"
          socialLinks={[
            {
              icon: <Twitter className="h-5 w-5" />,
              href: "https://twitter.com",
              label: "Twitter",
            },
            {
              icon: <Github className="h-5 w-5" />,
              href: "https://github.com",
              label: "GitHub",
            },
          ]}
          mainLinks={[
            { href: "/products", label: "Products" },
            { href: "/about", label: "About" },
            { href: "/blog", label: "Blog" },
            { href: "/contact", label: "Contact" },
          ]}
          legalLinks={[
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
          ]}
          copyright={{
            text: "© 2024 Awesome Corp",
            license: "All rights reserved",
          }}
        />
      </div>
    </>
  )
}
