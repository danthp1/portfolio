import { create } from 'zustand';
import * as THREE from 'three';

interface MoveDir {
  x: number;
  z: number;
}

// Define a type for camera path points
export interface CameraPathPoint {
  x: number;
  y: number;
  z: number;
}

interface State {
  selected: 0 | 1 | null;
  setSelected: (i: 0 | 1) => void;
  moveDir: MoveDir;
  setMoveDir: (dir: MoveDir) => void;
  movementSpeed: number;
  setMovementSpeed: (speed: number) => void;
  animationSpeed: number;
  setAnimationSpeed: (speed: number) => void;
  // Dev mode state
  devMode: boolean;
  setDevMode: (enabled: boolean) => void;
  // Camera path points
  cameraPathPoints: CameraPathPoint[];
  updateCameraPathPoint: (index: number, point: CameraPathPoint) => void;
  addCameraPathPoint: (point: CameraPathPoint) => void;
  deleteCameraPathPoint: (index: number) => void;
}

export default create<State>((set) => {
  // Tastatur-Listener
  const keys: Record<string, boolean> = {};

  // Only add event listeners on the client side
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      update();
    });
    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
      update();
    });
  }

  function update() {
    const dir: MoveDir = { x: 0, z: 0 };
    if (keys['KeyW']) dir.z -= 1;
    if (keys['KeyS']) dir.z += 1;
    if (keys['KeyA']) dir.x -= 1;
    if (keys['KeyD']) dir.x += 1;
    set({ moveDir: dir });
  }

  // Default camera path points (copied from RailCam component)
  const defaultCameraPathPoints: CameraPathPoint[] = [
    { x: -12, y: 2, z: -12 },
    { x: -8, y: 3, z: -8 },
    { x: -4, y: 3.5, z: -4 },
    { x: 0, y: 3.5, z: -2 },
    { x: 6, y: 3, z: 0 },
    { x: 12, y: 4, z: 0.5 },
    { x: 19, y: 5, z: 0.5 },
    { x: 20, y: 8, z: 0 },
    { x: 20, y: 8, z: 0 }
  ];

  return {
    selected: null,
    setSelected: (i) => set({ selected: i }),
    moveDir: { x: 0, z: 0 },
    setMoveDir: (dir) => set({ moveDir: dir }),
    movementSpeed: 2.5, // Default movement speed
    setMovementSpeed: (speed) => set({ movementSpeed: speed }),
    animationSpeed: 85, // Default animation speed (ms per frame)
    setAnimationSpeed: (speed) => set({ animationSpeed: speed }),
    // Dev mode state
    devMode: false,
    setDevMode: (enabled) => set({ devMode: enabled }),
    // Camera path points
    cameraPathPoints: defaultCameraPathPoints,
    updateCameraPathPoint: (index, point) => set((state) => {
      const newPoints = [...state.cameraPathPoints];
      newPoints[index] = point;
      return { cameraPathPoints: newPoints };
    }),
    addCameraPathPoint: (point) => set((state) => {
      const newPoints = [...state.cameraPathPoints, point];
      return { cameraPathPoints: newPoints };
    }),
    deleteCameraPathPoint: (index) => set((state) => {
      if (index < 0 || index >= state.cameraPathPoints.length) return state;
      const newPoints = [...state.cameraPathPoints];
      newPoints.splice(index, 1);
      return { cameraPathPoints: newPoints };
    }),
  };
});
