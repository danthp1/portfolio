import { create } from 'zustand';

interface MoveDir {
  x: number;
  z: number;
}
interface State {
  selected: 0 | 1 | null;
  setSelected: (i: 0 | 1) => void;
  moveDir: MoveDir;
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

  return {
    selected: null,
    setSelected: (i) => set({ selected: i }),
    moveDir: { x: 0, z: 0 },
  };
});
