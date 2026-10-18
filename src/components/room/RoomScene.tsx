import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Environment, Grid, Lightformer, OrbitControls } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";
import { FurnitureShape } from "./FurnitureMesh";
import type { Furniture, Room } from "@/lib/room";

interface Props {
  room: Room;
  items: Furniture[];
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, z: number, first: boolean) => void;
  showGrid?: boolean;
  interactive?: boolean;
}

export function RoomScene({ room, items, selected, onSelect, onMove, showGrid = true, interactive = true }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const first = useRef(false);
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const hit = useRef(new THREE.Vector3());
  const offset = useRef<[number, number]>([0, 0]);
  const { width: W, length: L, height: H } = room;
  const t = 0.1;

  const down = (e: ThreeEvent<PointerEvent>, it: Furniture) => {
    if (!interactive) return;
    e.stopPropagation();
    onSelect?.(it.id);
    e.ray.intersectPlane(plane.current, hit.current);
    offset.current = [it.position[0] - hit.current.x, it.position[2] - hit.current.z];
    first.current = true;
    setDragging(it.id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    if (e.ray.intersectPlane(plane.current, hit.current)) {
      onMove?.(dragging, hit.current.x + offset.current[0], hit.current.z + offset.current[1], first.current);
      first.current = false;
    }
  };

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [W * 0.9, H * 2, L * 1.3], fov: 45 }} gl={{ preserveDrawingBuffer: true }}
      onPointerMissed={() => onSelect?.(null)}>
      <color attach="background" args={["#ece3d4"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 9, 6]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} />
      <Environment resolution={64}>
        <Lightformer intensity={1.5} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={0.8} color="#ffe2c0" position={[-5, 2, 0]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} />
      </Environment>

      <group onPointerMove={move} onPointerUp={() => setDragging(null)}>
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[W, L]} />
          <meshStandardMaterial color={room.floorColor} roughness={0.7} />
        </mesh>
        {/* drag catcher */}
        {dragging && (
          <mesh rotation-x={-Math.PI / 2} position-y={0.001} visible={false}>
            <planeGeometry args={[100, 100]} />
          </mesh>
        )}
      </group>
      {showGrid && <Grid args={[W, L]} position-y={0.002} cellSize={0.5} cellColor="#00000022" sectionSize={1} sectionColor="#00000040" fadeDistance={40} />}

      {/* walls: back and left solid, right low */}
      <mesh position={[0, H / 2, -L / 2 - t / 2]} receiveShadow castShadow>
        <boxGeometry args={[W + t * 2, H, t]} /><meshStandardMaterial color={room.wallColor} />
      </mesh>
      <mesh position={[-W / 2 - t / 2, H / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[t, H, L]} /><meshStandardMaterial color={room.wallColor} />
      </mesh>
      <mesh position={[W / 2 + t / 2, 0.15, 0]} receiveShadow>
        <boxGeometry args={[t, 0.3, L]} /><meshStandardMaterial color={room.wallColor} />
      </mesh>
      <mesh position={[0, 0.15, L / 2 + t / 2]} receiveShadow>
        <boxGeometry args={[W + t * 2, 0.3, t]} /><meshStandardMaterial color={room.wallColor} />
      </mesh>

      {items.map((it) => (
        <group key={it.id} position={it.position} rotation-y={it.rotation}
          onPointerDown={(e) => down(e, it)} onPointerMove={move} onPointerUp={() => setDragging(null)}>
          <FurnitureShape item={it} />
          {selected === it.id && (
            <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[it.size[0] + 0.15, it.size[2] + 0.15]} />
              <meshBasicMaterial color="#c4623a" transparent opacity={0.35} />
            </mesh>
          )}
        </group>
      ))}

      <OrbitControls makeDefault enabled={!dragging} maxPolarAngle={Math.PI / 2.1} minDistance={2} maxDistance={25} target={[0, 0.8, 0]} />
    </Canvas>
  );
}
