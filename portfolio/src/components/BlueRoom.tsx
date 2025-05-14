// components/BlueRoom.jsx
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, OrbitControls, Stars, useHelper, PointerLockControls, Html, useTexture } from '@react-three/drei'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import * as THREE from 'three'
import { RectAreaLight } from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { useRouter } from 'next/navigation'
import { Art } from '@/payload-types'
import LoadingScreen from './LoadingScreen'

// Register plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
  RectAreaLightUniformsLib.init()
}

// Figure component - controllable silhouette
const Figure = ({ position, controlId, setActiveFigure, isActive, sharedGeometries, sharedMaterials }) => {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  const [frustumCulled, setFrustumCulled] = useState(true)

  const handleClick = e => {
    e.stopPropagation()
    setActiveFigure(controlId)
  }

  // Use the shared material but update its color based on state
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      meshRef.current.material.color.set(isActive ? '#000066' : (hovered ? '#333333' : '#000000'));
    }
  }, [isActive, hovered]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      frustumCulled={frustumCulled}
      geometry={sharedGeometries.figureBox}
    >
      <primitive object={sharedMaterials.figure} attach="material" />
    </mesh>
  )
}

// Glowing panel component
const GlowingPanel = ({ position, scale, rotation, setActivePanel, isActive }) => {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)

  const handleClick = e => {
    e.stopPropagation()
    setActivePanel(true)
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scale}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={isActive ? '#ffffff' : (hovered ? '#e6f7ff' : '#d6f0ff')}
        emissive="#66b3ff"
        emissiveIntensity={isActive ? 2 : (hovered ? 1.5 : 1)}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Floor component with grid pattern
const Floor = ({ currentRoom }) => {
  const gridSize = 30
  const gridDivisions = 30

  let floorColor, gridColor1, gridColor2
  switch (currentRoom) {
    case 'entrance':
      floorColor = "#550000"; gridColor1 = "#880000"; gridColor2 = "#660000"
      break
    case 'gallery1':
      floorColor = "#005500"; gridColor1 = "#008800"; gridColor2 = "#006600"
      break
    default:
      floorColor = "#0055aa"; gridColor1 = "#0088ff"; gridColor2 = "#0066cc"
  }

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial
          color={floorColor}
          metalness={0.2}
          roughness={0.4}
          opacity={0.8}
          transparent
        />
      </mesh>
      <gridHelper
        args={[gridSize, gridDivisions, gridColor1, gridColor2]}
        position={[0, -0.99, 0]}
      />
      <Stars count={200} position={[0, -0.5, 0]} radius={15} depth={4} saturation={0} fade speed={0.5} />
    </group>
  )
}

// Room component
const Room = ({ dimensions, wallColors, activeWall, setActiveWall }) => {
  const [w, h, d] = dimensions
  const handleWallClick = idx => setActiveWall(idx)

  return (
    <mesh>
      <boxGeometry args={[w, h, d]} />
      {wallColors.map((col, i) => (
        <meshStandardMaterial
          key={i}
          attach={`material-${i}`}
          color={activeWall === i ? '#66b3ff' : col}
          side={THREE.BackSide}
          transparent
          opacity={0.5}
          onClick={() => handleWallClick(i)}
        />
      ))}
    </mesh>
  )
}

// Projection surface component
const ProjectionSurface = ({ position, rotation, patternType, isActive, setActiveProjection }) => {
  const meshRef = useRef()
  const [pattern, setPattern] = useState(patternType || 'dots')
  const [hovered, setHovered] = useState(false)

  const handleClick = e => {
    e.stopPropagation()
    setActiveProjection(true)
  }

  useEffect(() => {
    // apply texture based on `pattern`
  }, [pattern])

  return (
    <>
      <mesh
        ref={meshRef}
        position={position}
        rotation={rotation}
        renderOrder={1}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#66b3ff"
          emissiveIntensity={isActive ? 3 : (hovered ? 2 : 1)}
          transparent
          opacity={0.9}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <rectAreaLight
        width={10}
        height={6}
        intensity={2}
        color="#66b3ff"
        position={position}
        rotation={rotation}
      />
    </>
  )
}

// Art display component - updated to match the provided example
const ArtDisplay = ({ position, rotation, artData = null, scale = [3, 2, 0.1] }) => {
  const router = useRouter()
  const image = useRef()
  const frame = useRef()
  const [hovered, setHovered] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [rnd] = useState(() => Math.random())

  // Add distance-based Level of Detail (LOD)
  const distance = useThree(state => {
    if (!state.camera || !position) return 10;
    return state.camera.position.distanceTo(new THREE.Vector3(...position));
  });

  // Adjust detail level based on distance
  const detailLevel = distance < 5 ? 'high' : distance < 15 ? 'medium' : 'low';
  // Load textures at the top level of the component
  const defaultTextureUrl = '/media/canvas-export.png';
  let defaultTexture = null;
  try {
    defaultTexture = useTexture(defaultTextureUrl);
  } catch (error) {
    console.error('Error loading default texture:', error);
    // Create a fallback texture when the default texture fails to load
    const fallbackTexture = new THREE.Texture();
    fallbackTexture.image = new Image();
    fallbackTexture.needsUpdate = true;
    defaultTexture = fallbackTexture;
  }

  // Load art texture if available
  const artTextureUrl = artData?.image?.url;ordne dne Ferqwuelgyn specturm auch umn einen keugel an udn wo auf jedem radius dide reqeuncy gespielt wird


  Die waveform soll einen 3d landscpae werden die auf die waverform reagierunft und ishc egpanded

  de rparticval voll sopll häghere recativität haben udn sicgh weitter vom zenter enfenrne können jed nach dem wie die frewquenrcyz etc ist



  ebenfalls entferne geermottic plus e und füge heirzu eune neue visulaisuierung hinzu


  zusätzlich funtktioniert immer noch cnith
  let texture = null;
  try {
    // Only try to load art texture if URL exists
    texture = artTextureUrl ? useTexture(artTextureUrl) : defaultTexture;
  } catch (error) {
    console.error('Error loading texture:', error);
    // Fall back to default texture or create a new fallback if default is also null
    texture = defaultTexture || (() => {
      const fallbackTexture = new THREE.Texture();
      fallbackTexture.image = new Image();
      fallbackTexture.needsUpdate = true;
      return fallbackTexture;
    })();
  }

  // Use useMemo for derived values that don't involve hooks
  const finalTexture = React.useMemo(() => {
    return texture || defaultTexture;
  }, [texture, defaultTexture]);

  // Add cleanup for textures
  useEffect(() => {
    return () => {
      try {
        if (texture && texture !== defaultTexture && typeof texture.dispose === 'function') {
          texture.dispose();
        }
        if (defaultTexture && typeof defaultTexture.dispose === 'function') {
          // Only dispose if not being used elsewhere
          if (texture !== defaultTexture) {
            defaultTexture.dispose();
          }
        }
      } catch (error) {
        console.error('Error disposing textures:', error);
      }
    };
  }, [texture, defaultTexture, finalTexture]);

  const GOLDENRATIO = 1.61803398875
  const name = artData?.title || 'Untitled Artwork'

  // Generate a unique ID for this instance if needed
  const uniqueId = React.useMemo(() => Math.random().toString(36).substr(2, 9), [])

  // Zoom animation
  useEffect(() => {
    if (!frame.current) return
    const target = zoomed
      ? [scale[0] * 1.5, scale[1] * 1.5, scale[2]]
      : scale
    gsap.to(frame.current.scale, {
      x: target[0], y: target[1], z: target[2],
      duration: 0.5, ease: 'power2.out'
    })
  }, [zoomed, scale])

  // Handle Escape to exit zoom
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && zoomed && setZoomed(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])

  const handleClick = e => {
    e.stopPropagation()
    if (!artData) {
      // If no art data, just toggle zoom
      setZoomed(!zoomed)
      return
    }

    zoomed
      ? artData.slug && router.push(`/art/${artData.slug}`)
      : setZoomed(true)
  }

  useFrame((state, dt) => {
    if (image.current && image.current.material) {
      image.current.material.zoom = 2 + Math.sin(rnd * 10000 + state.clock.elapsedTime / 3) / 2
    }
    if (frame.current && frame.current.material) {
      frame.current.material.color.lerp(new THREE.Color(hovered ? 'orange' : 'white'), 0.1 * dt * 10)
    }
  })

  return (
    <group position={position} rotation={rotation}>
      <mesh
        name={artData?.id || `art-${uniqueId}`}
        onPointerOver={(e) => (e.stopPropagation(), setHovered(true))}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
        scale={[1, GOLDENRATIO, 0.05]}
        position={[0, GOLDENRATIO / 2, 0]}
      >
        <boxGeometry />
        <meshStandardMaterial color="#151515" metalness={0.5} roughness={0.5} envMapIntensity={2} />
        <mesh
          ref={frame}
          raycast={() => null}
          scale={[0.9, 0.93, 0.9]}
          position={[0, 0, 0.2]}
          visible={detailLevel !== 'low'} // Hide frame for distant objects
        >
          <boxGeometry />
          <meshBasicMaterial toneMapped={false} fog={false} />
        </mesh>
        <mesh
          ref={image}
          raycast={() => null}
          position={[0, 0, 0.7]}
          frustumCulled={true} // Enable frustum culling
        >
          <planeGeometry
            args={[0.85, 0.85 * GOLDENRATIO]}
            // Reduce geometry detail for distant objects
            widthSegments={detailLevel === 'high' ? 1 : 1}
            heightSegments={detailLevel === 'high' ? 1 : 1}
          />
          <meshBasicMaterial
            map={finalTexture || null}
            transparent
            // Adjust material quality based on distance
            depthWrite={detailLevel === 'high'}
            depthTest={detailLevel !== 'low'}
          />
        </mesh>
      </mesh>
      {/* Label - only show if we have a name */}
      {name && (
        <mesh position={[0.55, GOLDENRATIO, 0]}>
          <Html transform>
            <div style={{
              color: 'white',
              fontSize: '0.2em',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              textShadow: '1px 1px 2px black'
            }}>
              {name}
            </div>
          </Html>
        </mesh>
      )}
      {/* Spotlight */}
      <spotLight
        position={[0, 2, -2]}
        angle={Math.PI/8}
        penumbra={0.2}
        intensity={1}
        color="#ffffff"
        castShadow
      />
    </group>
  )
}

// Memoize ArtDisplay component to prevent unnecessary re-renders
const MemoizedArtDisplay = React.memo(ArtDisplay);

// Interactive object component
const InteractiveObject = ({ position, scale = [1,1,1], rotation = [0,0,0], color = "#66b3ff", onClick, isActive, description }) => {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  const [frustumCulled, setFrustumCulled] = useState(true)

  // Add distance-based Level of Detail (LOD)
  const distance = useThree(state => {
    if (!state.camera || !position) return 10;
    return state.camera.position.distanceTo(new THREE.Vector3(...position));
  });

  // Adjust detail level based on distance
  const detailLevel = distance < 5 ? 'high' : distance < 15 ? 'medium' : 'low';

  // Only show tooltip for nearby objects
  const showTooltip = hovered && detailLevel !== 'low';

  // Simplify material for distant objects
  const materialType = detailLevel === 'low' ? 'meshBasicMaterial' : 'meshStandardMaterial';

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scale}
      rotation={rotation}
      onClick={e => { e.stopPropagation(); onClick() }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      frustumCulled={frustumCulled}
    >
      <boxGeometry
        args={[1,1,1]}
        // Reduce geometry complexity for distant objects
        widthSegments={detailLevel === 'high' ? 8 : 1}
        heightSegments={detailLevel === 'high' ? 8 : 1}
        depthSegments={detailLevel === 'high' ? 8 : 1}
      />
      {materialType === 'meshBasicMaterial' ? (
        <meshBasicMaterial
          color={isActive ? '#ffffff' : (hovered ? '#a3d9ff' : color)}
        />
      ) : (
        <meshStandardMaterial
          color={isActive ? '#ffffff' : (hovered ? '#a3d9ff' : color)}
          emissive="#66b3ff"
          emissiveIntensity={isActive ? 2 : (hovered ? 1.5 : 1)}
          // Reduce material complexity for medium distance
          roughness={detailLevel === 'high' ? 0.5 : 1}
          metalness={detailLevel === 'high' ? 0.5 : 0}
        />
      )}
      {showTooltip && (
        <Html position={[0,1.5,0]} center>
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            whiteSpace: 'nowrap'
          }}>
            {description}
          </div>
        </Html>
      )}
    </mesh>
  )
}

// Door component
const Door = ({ position, rotation = [0,0,0], targetRoom, setCurrentRoom, description }) => {
  const [hovered, setHovered] = useState(false)

  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={e => { e.stopPropagation(); setCurrentRoom(targetRoom) }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[2,3,0.2]} />
      <meshStandardMaterial
        color={hovered ? '#a3d9ff' : '#4d94ff'}
        emissive="#66b3ff"
        emissiveIntensity={hovered ? 1.5 : 1}
      />
      {hovered && (
        <Html position={[0,2,0]} center>
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            whiteSpace: 'nowrap'
          }}>
            {description}
          </div>
        </Html>
      )}
    </mesh>
  )
}

// First-person controls
const FirstPersonControls = ({ isActive, figureId, position, currentRoom }) => {
  const { camera } = useThree()
  const controlsRef = useRef()
  const [moveF, setMoveF] = useState(false)
  const [moveB, setMoveB] = useState(false)
  const [moveL, setMoveL] = useState(false)
  const [moveR, setMoveR] = useState(false)
  const speed = 0.15

  const getRoomDimensions = () => ({
    entrance: [20,12,20],
    gallery1: [25,12,25],
    finalRoom: [30,15,30]
  }[currentRoom] || [20,12,20])

  useEffect(() => {
    if (!isActive) return

    // Get room dimensions for boundary checking
    const [w, h, d] = getRoomDimensions()
    const safeX = w/2 - 1
    const safeZ = d/2 - 1

    // Ensure position is within safe boundaries
    const validX = Math.max(-safeX, Math.min(safeX, position[0]))
    const validZ = Math.max(-safeZ, Math.min(safeZ, position[2]))

    // Set camera position with validated coordinates and height offset
    camera.position.set(validX, position[1]+1.7, validZ)

    // Log if position was adjusted (for debugging)
    if (validX !== position[0] || validZ !== position[2]) {
      console.log('Camera position adjusted to prevent wall collision')
    }
  }, [isActive, position, camera, getRoomDimensions])

  // Reset player position to center of room
  const resetPosition = () => {
    // Move to center of current room
    camera.position.set(0, position[1]+1.7, 0)
    console.log('Player position reset to center of room')
  }

  useEffect(() => {
    if (!isActive) return
    const down = e => {
      if (e.code==='KeyW') setMoveF(true)
      if (e.code==='KeyS') setMoveB(true)
      if (e.code==='KeyA') setMoveL(true)
      if (e.code==='KeyD') setMoveR(true)
      // Reset position if R key is pressed (emergency unstuck button)
      if (e.code==='KeyR') resetPosition()
    }
    const up = e => {
      if (e.code==='KeyW') setMoveF(false)
      if (e.code==='KeyS') setMoveB(false)
      if (e.code==='KeyA') setMoveL(false)
      if (e.code==='KeyD') setMoveR(false)
    }
    document.addEventListener('keydown', down)
    document.addEventListener('keyup', up)
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('keyup', up)
    }
  }, [isActive, resetPosition])

  useFrame(() => {
    if (!isActive) return
    const dir = new THREE.Vector3()
    const front = new THREE.Vector3(0, 0, Number(moveB) - Number(moveF))
    const side = new THREE.Vector3(Number(moveL) - Number(moveR), 0, 0)
    const rot = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
    dir.subVectors(front, side).normalize().multiplyScalar(speed).applyEuler(rot)

    const [w,d] = getRoomDimensions()
    const hw = w/2 - 0.5, hd = d/2 - 0.5
    const nx = camera.position.x + dir.x
    const nz = camera.position.z + dir.z
    if (Math.abs(nx) < hw) camera.position.x = nx
    if (Math.abs(nz) < hd) camera.position.z = nz
  })

  return isActive ? <PointerLockControls ref={controlsRef} /> : null
}

// Scene component

export default function BlueRoom() {
  const containerRef = useRef()
  const [firstPersonActive, setFirstPersonActive] = useState(false)

  // Game state
  const [gameEnded, setGameEnded] = useState(false)
  const [currentRoom, setCurrentRoom] = useState('entrance')

  // Create shared geometries and materials for object pooling
  const sharedGeometries = React.useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1),
    plane: new THREE.PlaneGeometry(1, 1),
    figureBox: new THREE.BoxGeometry(0.5, 1.8, 0.2)
  }), []);

  const sharedMaterials = React.useMemo(() => ({
    basic: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    standard: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
    figure: new THREE.MeshBasicMaterial({
      color: '#000000',
      opacity: 0.9,
      transparent: true
    })
  }), []);

  // Art data
  const [artworks, setArtworks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // Art data by room for progressive loading
  const artByRoom = {
    entrance: [0, 1, 2, 3], // Art indices for entrance room
    gallery1: [2, 3, 4, 0, 1, 5], // Art indices for gallery1
    finalRoom: [5, 0, 1, 2, 3, 4, 0, 3, 5, 2, 1, 4] // Art indices for finalRoom
  };

  // Function to reduce scene quality when memory is high
  const reduceSceneQuality = useCallback(() => {
    console.warn('Memory usage high, reducing scene quality');

    // Force texture disposal for non-visible rooms
    if (currentRoom !== 'entrance') {
      artByRoom.entrance.forEach(index => {
        const art = artworks[index];
        if (art?.image?.url) {
          // This is a hint to the garbage collector
          art.image._disposableTexture = null;
        }
      });
    }

    if (currentRoom !== 'gallery1') {
      artByRoom.gallery1.forEach(index => {
        const art = artworks[index];
        if (art?.image?.url) {
          art.image._disposableTexture = null;
        }
      });
    }

    if (currentRoom !== 'finalRoom') {
      artByRoom.finalRoom.forEach(index => {
        const art = artworks[index];
        if (art?.image?.url) {
          art.image._disposableTexture = null;
        }
      });
    }

    // Force a garbage collection hint
    setTimeout(() => {
      console.log('Attempting to free memory...');
      // This creates temporary objects that will be immediately garbage collected
      // which can trigger a collection cycle in some browsers
      const temp = Array(100).fill().map(() => new ArrayBuffer(1024 * 10));
    }, 100);
  }, [artworks, artByRoom, currentRoom]);

  // Implement a memory budget monitor
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Check memory usage periodically
    const memoryCheck = setInterval(() => {
      if (window.performance && window.performance.memory) {
        const memoryInfo = window.performance.memory;
        if (memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.8) {
          console.warn('Memory usage high, triggering cleanup');
          reduceSceneQuality();
        }
      }
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(memoryCheck);
      // Clean up geometries and materials
      Object.values(sharedGeometries).forEach(geometry => geometry.dispose());
      Object.values(sharedMaterials).forEach(material => material.dispose());
    };
  }, [sharedGeometries, sharedMaterials, reduceSceneQuality]);

  // ** Wichtig: figurePositions direkt hier deklarieren, bevor die Effekte darauf zugreifen **
  const [figurePositions, setFigurePositions] = useState({
    figure1: [0, 0, 0],  // Centered position to prevent spawning in walls
    figure2: [3, 0, 0],  // Positioned away from walls
    figure3: [-5, 0, 8],
    figure4: [0, 0, -8],
    figure5: [-8, 0, -3],
    lovedOne: [0, 0, -15]
  })

  // Controls state
  const [activeFigure, setActiveFigure] = useState(null)
  const [firstPersonMode, setFirstPersonMode] = useState(false)

  // Track which rooms have loaded art
  const [loadedRooms, setLoadedRooms] = useState(['entrance']);

  // Function to load art for a specific room
  const loadArtForRoom = useCallback((roomName) => {
    if (loadedRooms.includes(roomName)) return; // Already loaded

    // Mark this room as loaded
    setLoadedRooms(prev => [...prev, roomName]);

    // Update loading progress
    setLoadingProgress(prev => Math.min(prev + 10, 95));

    console.log(`Loading art for room: ${roomName}`);
  }, [loadedRooms]);

  // Load art for current room when it changes
  useEffect(() => {
    if (!isLoading) {
      loadArtForRoom(currentRoom);
    }
  }, [currentRoom, isLoading, loadArtForRoom]);

  // Fetch art data from Payload API
  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        // Simulate initial loading progress
        setLoadingProgress(10)

        const response = await fetch('/api/art')
        if (!response.ok) {
          throw new Error('Failed to fetch artworks')
        }

        // Update progress after fetch completes
        setLoadingProgress(40)

        const data = await response.json()

        // Update progress after parsing JSON
        setLoadingProgress(60)

        // Transform the data to match the expected structure
        const transformedData = data.docs.map((art, index, array) => {
          // Update progress during transformation
          const progressIncrement = 20 / array.length
          setLoadingProgress(60 + progressIncrement * (index + 1))

          return {
            id: art.id.toString(),
            title: art.title,
            slug: art.slug || '',
            image: {
              url: art.heroImage?.url || (art.heroImage?.sizes?.medium?.url) || '/abstract-art-1.jpg' // Try to get the best image URL
            }
          }
        })

        setArtworks(transformedData)
        setLoadingProgress(90)

        // Simulate final loading steps
        setTimeout(() => {
          setLoadingProgress(100)
          setIsLoading(false)
        }, 500)
      } catch (error) {
        console.error('Error fetching artworks:', error)
        // Fallback to default artworks if fetch fails
        setArtworks([
          { id: 'art1', title: 'Abstract Composition', slug: 'abstract-composition', image: { url: '/abstract-art-1.jpg' } },
          { id: 'art2', title: 'Digital Landscape', slug: 'digital-landscape', image: { url: '/landscape-art-1.jpg' } },
          { id: 'art3', title: 'Portrait Study', slug: 'portrait-study', image: { url: '/portrait-art-1.jpg' } },
          { id: 'art4', title: 'Modern Sculpture', slug: 'modern-sculpture', image: { url: '/sculpture-art-1.jpg' } },
          { id: 'art5', title: 'Urban Photography', slug: 'urban-photography', image: { url: '/urban-art-1.jpg' } },
          { id: 'art6', title: 'Experimental Media', slug: 'experimental-media', image: { url: '/experimental-art-1.jpg' } }
        ])

        // Even on error, complete the loading process
        setLoadingProgress(100)
        setTimeout(() => setIsLoading(false), 500)
      }
    }

    fetchArtworks()
  }, [])

  // Load saved position with validation
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = localStorage.getItem('blueRoomCharacterPosition')
    const sr = localStorage.getItem('blueRoomCurrentRoom')

    // Validate and set room
    if (sr && ['entrance', 'gallery1', 'finalRoom'].includes(sr)) {
      setCurrentRoom(sr)
    } else {
      // Clear invalid room data
      localStorage.removeItem('blueRoomCurrentRoom')
    }

    if (sp) {
      try {
        const parsed = JSON.parse(sp)

        // Validate positions to ensure they're within room boundaries
        const validatedPositions = {}

        Object.entries(parsed).forEach(([figureId, position]) => {
          // Get room dimensions based on the figure's room
          let roomDimensions = [20, 12, 20] // Default to entrance room dimensions

          if (figureId.startsWith('figure3') || figureId.startsWith('figure4')) {
            roomDimensions = [25, 12, 25] // gallery1 dimensions
          } else if (figureId.startsWith('figure5') || figureId === 'lovedOne') {
            roomDimensions = [30, 15, 30] // finalRoom dimensions
          }

          // Calculate safe boundaries (half width/depth minus buffer)
          const [w, h, d] = roomDimensions
          const safeX = w/2 - 1
          const safeZ = d/2 - 1

          // Ensure position is within safe boundaries
          const validX = Math.max(-safeX, Math.min(safeX, position[0]))
          const validY = position[1] // Y position doesn't need validation
          const validZ = Math.max(-safeZ, Math.min(safeZ, position[2]))

          validatedPositions[figureId] = [validX, validY, validZ]
        })

        setFigurePositions(prev => ({ ...prev, ...validatedPositions }))
      } catch (e) {
        console.error('Error parsing saved position:', e)
        // Clear invalid position data
        localStorage.removeItem('blueRoomCharacterPosition')
      }
    }
  }, [])

  // Debounce function to prevent frequent localStorage writes
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Create debounced save function
  const debouncedSavePosition = useCallback(
    debounce((position, room) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem('blueRoomCharacterPosition', JSON.stringify(position));
      localStorage.setItem('blueRoomCurrentRoom', room);
      console.log('Position saved to localStorage (debounced)');
    }, 500), // 500ms debounce time
    []
  );

  // Save position when it changes
  useEffect(() => {
    if (typeof window === 'undefined' || !activeFigure) return;
    debouncedSavePosition({ [activeFigure]: figurePositions[activeFigure] }, currentRoom);
  }, [figurePositions, activeFigure, currentRoom, debouncedSavePosition])

  // Room configs
  const rooms = {
    entrance: {
      dimensions: [20,12,20],
      wallColors: Array(6).fill('#4d0000'),
      objects: [
        { id: 'info1', position: [-8,1,-5], description: 'Willkommen im Museum der Liebe' },
        { id: 'info2', position: [8,1,-5], description: 'Finde deine große Liebe' }
      ],
      figures: ['figure1','figure2'],
      doors: [{ position: [0,0,-9.9], rotation: [0,0,0], targetRoom: 'gallery1', description: 'Zur Galerie' }]
    },
    gallery1: {
      dimensions: [25,12,25],
      wallColors: Array(6).fill('#004d00'),
      objects: [
        { id: 'art1', position: [-10,1,-5], scale: [2,2,0.5], description: 'Kunstwerk: "Sehnsucht"' },
        { id: 'art2', position: [10,1,-5], scale: [2,2,0.5], description: 'Kunstwerk: "Begegnung"' },
        { id: 'sculpture1', position: [0,0,5], scale: [1,3,1], description: 'Skulptur: "Verbundenheit"' }
      ],
      figures: ['figure3','figure4'],
      doors: [
        { position: [0,0,-12.4], rotation: [0,0,0], targetRoom: 'finalRoom', description: 'Zum letzten Raum' },
        { position: [0,0,12.4], rotation: [0,Math.PI,0], targetRoom: 'entrance', description: 'Zurück zum Eingang' }
      ]
    },
    finalRoom: {
      dimensions: [30,15,30],
      wallColors: Array(6).fill('#003380'),
      objects: [
        { id: 'heart', position: [0,1,0], scale: [1,1,1], color: '#ff3366', description: 'Das Herz der Liebe' }
      ],
      figures: ['figure5','lovedOne'],
      doors: [{ position: [0,0,14.9], rotation: [0,Math.PI,0], targetRoom: 'gallery1', description: 'Zurück zur Galerie' }]
    }
  }

  // Helpers for rendering
  const getLightColors = () => {
    switch (currentRoom) {
      case 'entrance': return { ambient:0.4, point1:"#ffb3b3", point2:"#ffb380" }
      case 'gallery1': return { ambient:0.4, point1:"#b3ffb3", point2:"#80ff80" }
      default: return { ambient:0.4, point1:"#b3d9ff", point2:"#80bfff" }
    }
  }
  const lightColors = getLightColors()

  // Reduced number of lights for better performance
  const createOptimizedLights = () => {
    const [w,h,d] = rooms[currentRoom].dimensions
    const hw = w/2 - 1, hd = d/2 - 1, floor = -0.5, ceil = h/2 -1

    // Return a single directional light instead of multiple spotlights
    // Use lower shadow map resolution for better performance
    return (
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.8}
        color={lightColors.point1}
        castShadow
        shadow-mapSize-width={512} // Reduced from 1024 for performance
        shadow-mapSize-height={512} // Reduced from 1024 for performance
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
    )
  }

  const renderArtOnWalls = () => {
    if (isLoading || artworks.length === 0) {
      // Return loading placeholders if still loading or no artworks available
      return null;
    }

    const [w,h,d] = rooms[currentRoom].dimensions
    const hw = w/2 -1, hd = d/2 -1, wallH = 3
    const GOLDENRATIO = 1.61803398875
    const spacing = 4 * GOLDENRATIO // Space between artworks

    const artPos = {
      entrance: [
        {position:[-5,wallH,-hd+0.1],rotation:[0,0,0],artIndex:0},
        {position:[5,wallH,-hd+0.1],rotation:[0,0,0],artIndex:1},
        {position:[hw-0.1,wallH,-5],rotation:[0,-Math.PI/2,0],artIndex:2},
        {position:[-hw+0.1,wallH,-5],rotation:[0,Math.PI/2,0],artIndex:3},
      ],
      gallery1: [
        {position:[-8,wallH,-hd+0.1],rotation:[0,0,0],artIndex:2},
        {position:[0,wallH,-hd+0.1],rotation:[0,0,0],artIndex:3},
        {position:[8,wallH,-hd+0.1],rotation:[0,0,0],artIndex:4},
        {position:[-8,wallH,hd-0.1],rotation:[0,Math.PI,0],artIndex:0},
        {position:[8,wallH,hd-0.1],rotation:[0,Math.PI,0],artIndex:1},
        {position:[hw-0.1,wallH,8],rotation:[0,-Math.PI/2,0],artIndex:5},
        {position:[hw-0.1,wallH,-8],rotation:[0,-Math.PI/2,0],artIndex:0},
        {position:[-hw+0.1,wallH,8],rotation:[0,Math.PI/2,0],artIndex:1},
        {position:[-hw+0.1,wallH,-8],rotation:[0,Math.PI/2,0],artIndex:4},
      ],
      finalRoom: [
        {position:[-10,wallH,-hd+0.1],rotation:[0,0,0],artIndex:5},
        {position:[0,wallH,-hd+0.1],rotation:[0,0,0],artIndex:0},
        {position:[10,wallH,-hd+0.1],rotation:[0,0,0],artIndex:1},
        {position:[-10,wallH,hd-0.1],rotation:[0,Math.PI,0],artIndex:2},
        {position:[0,wallH,hd-0.1],rotation:[0,Math.PI,0],artIndex:3},
        {position:[10,wallH,hd-0.1],rotation:[0,Math.PI,0],artIndex:4},
        {position:[hw-0.1,wallH,10],rotation:[0,-Math.PI/2,0],artIndex:0},
        {position:[hw-0.1,wallH,0],rotation:[0,-Math.PI/2,0],artIndex:3},
        {position:[hw-0.1,wallH,-10],rotation:[0,-Math.PI/2,0],artIndex:5},
        {position:[-hw+0.1,wallH,10],rotation:[0,Math.PI/2,0],artIndex:2},
        {position:[-hw+0.1,wallH,0],rotation:[0,Math.PI/2,0],artIndex:1},
        {position:[-hw+0.1,wallH,-10],rotation:[0,Math.PI/2,0],artIndex:4},
      ]
    }

    // Create a reflective floor under the artworks
    const floor = (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color="#050505"
          metalness={0.5}
          roughness={1}
          envMapIntensity={1}
        />
      </mesh>
    );

    return (
      <>
        {floor}
        {(artPos[currentRoom] || []).map((ap, i) => (
          <MemoizedArtDisplay
            key={`art-${currentRoom}-${i}`}
            position={ap.position}
            rotation={ap.rotation}
            artData={artworks.length > 0 ? artworks[ap.artIndex % artworks.length] : null}
            scale={[2, 2, 0.1]} // Adjusted scale to work better with golden ratio frames
          />
        ))}
      </>
    )
  }

  // Handlers - memoized to prevent unnecessary re-renders
  const handleFigureSelect = useCallback(id => {
    if (id === 'lovedOne' && activeFigure) {
      setGameEnded(true)
      return
    }
    setActiveFigure(id)
    setFirstPersonMode(true)
  }, [activeFigure])
  const handleObjectInteraction = id => console.log('Interacting with', id)
  const exitFirstPersonMode = () => {
    setFirstPersonMode(false)
    setActiveFigure(null)
  }

  // Escape to exit first-person
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && firstPersonMode && exitFirstPersonMode()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [firstPersonMode])

  const currentRoomConfig = rooms[currentRoom]

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100vh',
          position: 'fixed',
          top: 0, left: 0, zIndex: 1000
        }}
      >
        <LoadingScreen progress={Math.round(loadingProgress)} />
      </div>
    );
  }

  return (
      <Canvas
        style={{
          width: '100%',
          height: '100vh',
          backgroundColor: '#191920',
          position: 'fixed',
        }}
        gl={{
          antialias: false, // Disabled for performance
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          precision: 'lowp' // Use lower precision for better performance
        }}
        dpr={[0.5, 1]} // Reduce resolution for better performance
        performance={{ min: 0.5 }}
        frameloop="demand" // Only render when needed
        camera={{ position: [0,0,15], fov: 60 }}
        shadows={false} // Disable shadows for performance
        flat // Use flat shading for better performance
      >
        <ambientLight intensity={lightColors.ambient} />
        {createOptimizedLights()}

        <Room
          dimensions={currentRoomConfig.dimensions}
          wallColors={currentRoomConfig.wallColors}
          activeWall={null}
          setActiveWall={() => {}}
        />

        {renderArtOnWalls()}

        {currentRoomConfig.figures.map(id => (
          <Figure
            key={id}
            position={figurePositions[id]}
            controlId={id}
            setActiveFigure={handleFigureSelect}
            isActive={activeFigure === id}
            sharedGeometries={sharedGeometries}
            sharedMaterials={sharedMaterials}
          />
        ))}

        {currentRoomConfig.objects.map(obj => (
          <InteractiveObject
            key={obj.id}
            position={obj.position}
            scale={obj.scale}
            rotation={obj.rotation}
            color={obj.color}
            onClick={() => handleObjectInteraction(obj.id)}
            isActive={false}
            description={obj.description}
          />
        ))}

        {currentRoomConfig.doors.map((door,i) => (
          <Door
            key={i}
            position={door.position}
            rotation={door.rotation}
            targetRoom={door.targetRoom}
            setCurrentRoom={setCurrentRoom}
            description={door.description}
          />
        ))}

        {firstPersonMode && activeFigure && (
          <FirstPersonControls
            isActive={firstPersonMode}
            figureId={activeFigure}
            position={figurePositions[activeFigure]}
            currentRoom={currentRoom}
          />
        )}

        <Floor currentRoom={currentRoom} />

        <fog
          attach="fog"
          args={['#191920', 0, 15]}
        />
        <color attach="background" args={['#191920']} />

        {gameEnded && (
          <Html center position={[0, 0, -5]}>
            <div style={{
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '20px',
              borderRadius: '10px',
              textAlign: 'center',
              width: '300px'
            }}>
              <h2>Herzlichen Glückwunsch!</h2>
              <p>Du hast deine große Liebe gefunden!</p>
              <button
                onClick={() => {
                  setGameEnded(false)
                  setFirstPersonMode(false)
                  setActiveFigure(null)
                  setCurrentRoom('entrance')
                }}
                style={{
                  background: '#4d94ff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  color: 'white',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                Neu starten
              </button>
            </div>
          </Html>
        )}
      </Canvas>
  )
}
