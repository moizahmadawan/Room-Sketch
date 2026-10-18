import type { Furniture } from "@/lib/room";

function Box({ p, s, c }: { p: [number, number, number]; s: [number, number, number]; c: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.8} />
    </mesh>
  );
}

export function FurnitureShape({ item }: { item: Furniture }) {
  const [w, h, d] = item.size;
  const c = item.color;
  const leg = "#5a4030";
  const legs = (lh: number, inset = 0.05) =>
    ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([x, z], i) => (
      <Box key={i} p={[x * (w / 2 - inset), lh / 2, z * (d / 2 - inset)]} s={[0.05, lh, 0.05]} c={leg} />
    ));
  switch (item.type) {
    case "bed":
      return (<>
        <Box p={[0, 0.15, 0]} s={[w, 0.3, d]} c="#7a5a40" />
        <Box p={[0, 0.4, 0.05]} s={[w - 0.08, 0.2, d - 0.15]} c={c} />
        <Box p={[0, 0.55, -d / 2 + 0.05]} s={[w, 1.1, 0.1]} c="#7a5a40" />
        <Box p={[-w / 4, 0.55, -d / 2 + 0.3]} s={[w / 2.6, 0.1, 0.35]} c="#f5f1e8" />
        <Box p={[w / 4, 0.55, -d / 2 + 0.3]} s={[w / 2.6, 0.1, 0.35]} c="#f5f1e8" />
      </>);
    case "sofa":
      return (<>
        <Box p={[0, 0.25, 0.05]} s={[w - 0.3, 0.3, d - 0.2]} c={c} />
        <Box p={[0, 0.5, -d / 2 + 0.1]} s={[w, h - 0.15, 0.2]} c={c} />
        <Box p={[-w / 2 + 0.1, 0.32, 0]} s={[0.2, 0.55, d]} c={c} />
        <Box p={[w / 2 - 0.1, 0.32, 0]} s={[0.2, 0.55, d]} c={c} />
      </>);
    case "chair":
      return (<>
        {legs(0.45)}
        <Box p={[0, 0.47, 0]} s={[w, 0.05, d]} c={c} />
        <Box p={[0, 0.7, -d / 2 + 0.03]} s={[w, 0.45, 0.05]} c={c} />
      </>);
    case "table":
    case "desk":
      return (<>
        {legs(h - 0.04)}
        <Box p={[0, h - 0.02, 0]} s={[w, 0.04, d]} c={c} />
      </>);
    case "wardrobe":
      return (<>
        <Box p={[0, h / 2, 0]} s={[w, h, d]} c={c} />
        <Box p={[0, h / 2, d / 2 + 0.005]} s={[0.01, h - 0.1, 0.01]} c="#3a2a20" />
        <Box p={[-0.06, h / 2, d / 2 + 0.02]} s={[0.02, 0.2, 0.02]} c="#c0a060" />
        <Box p={[0.06, h / 2, d / 2 + 0.02]} s={[0.02, 0.2, 0.02]} c="#c0a060" />
      </>);
    case "lamp":
      return (<>
        <mesh position={[0, 0.02, 0]} castShadow><cylinderGeometry args={[0.15, 0.15, 0.04, 20]} /><meshStandardMaterial color="#333" /></mesh>
        <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.015, 0.015, h, 8]} /><meshStandardMaterial color="#333" /></mesh>
        <mesh position={[0, h - 0.1, 0]} castShadow><cylinderGeometry args={[0.1, w / 2, 0.3, 24, 1, true]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.4} side={2} /></mesh>
        <pointLight position={[0, h - 0.2, 0]} intensity={0.6} distance={3} color="#ffd9a0" />
      </>);
    case "plant":
      return (<>
        <mesh position={[0, 0.17, 0]} castShadow><cylinderGeometry args={[w / 2.2, w / 3, 0.35, 20]} /><meshStandardMaterial color="#d8cfc0" /></mesh>
        <mesh position={[0, 0.7, 0]} castShadow><sphereGeometry args={[w / 2, 16, 12]} /><meshStandardMaterial color={c} roughness={1} /></mesh>
        <mesh position={[0.08, 0.95, 0.05]} castShadow><sphereGeometry args={[w / 2.8, 16, 12]} /><meshStandardMaterial color={c} roughness={1} /></mesh>
      </>);
  }
}
