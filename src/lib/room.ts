export type FurnitureType = "bed" | "sofa" | "chair" | "table" | "wardrobe" | "lamp" | "desk" | "plant";

export interface Furniture {
  id: string;
  type: FurnitureType;
  name: string;
  position: [number, number, number];
  rotation: number;
  size: [number, number, number];
  color: string;
}

export interface Room {
  length: number;
  width: number;
  height: number;
  wallColor: string;
  floorColor: string;
}

export interface Design {
  id: string;
  name: string;
  updatedAt: number;
  room: Room;
  items: Furniture[];
}

export const LIMITS = { min: 2, max: 12, hMin: 2.2, hMax: 5 };

export const CATALOG: { type: FurnitureType; name: string; category: string; size: [number, number, number]; color: string }[] = [
  { type: "bed", name: "Bed", category: "Bedroom", size: [1.6, 0.6, 2.1], color: "#d9cbb5" },
  { type: "wardrobe", name: "Wardrobe", category: "Bedroom", size: [1.2, 2, 0.6], color: "#a07850" },
  { type: "sofa", name: "Sofa", category: "Living", size: [2, 0.85, 0.9], color: "#b8613f" },
  { type: "table", name: "Table", category: "Living", size: [1.2, 0.75, 0.8], color: "#8a6440" },
  { type: "lamp", name: "Floor lamp", category: "Living", size: [0.4, 1.6, 0.4], color: "#e8d9b0" },
  { type: "plant", name: "Plant", category: "Living", size: [0.5, 1.1, 0.5], color: "#5b7d4a" },
  { type: "chair", name: "Chair", category: "Office", size: [0.5, 0.9, 0.5], color: "#4a5a6a" },
  { type: "desk", name: "Desk", category: "Office", size: [1.4, 0.75, 0.7], color: "#c9a77c" },
];

export const uid = () => Math.random().toString(36).slice(2, 10);

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function clampToRoom(f: Furniture, room: Room): [number, number, number] {
  // Use the rotated bounding box so a piece turned 45° still cannot poke through a wall.
  const cos = Math.abs(Math.cos(f.rotation));
  const sin = Math.abs(Math.sin(f.rotation));
  const hx = (cos * f.size[0] + sin * f.size[2]) / 2;
  const hz = (sin * f.size[0] + cos * f.size[2]) / 2;
  const mx = Math.max(0, room.width / 2 - hx);
  const mz = Math.max(0, room.length / 2 - hz);
  return [clamp(f.position[0], -mx, mx), 0, clamp(f.position[2], -mz, mz)];
}

export function makeItem(type: FurnitureType, x = 0, z = 0): Furniture {
  const c = CATALOG.find((c) => c.type === type)!;
  return { id: uid(), type, name: c.name, position: [x, 0, z], rotation: 0, size: [...c.size], color: c.color };
}

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

function isValidItem(i: unknown): i is Furniture {
  const x = i as Furniture;
  return (
    !!x && typeof x.id === "string" && CATALOG.some((c) => c.type === x.type) &&
    Array.isArray(x.position) && x.position.length === 3 && x.position.every(isNum) &&
    Array.isArray(x.size) && x.size.length === 3 && x.size.every((n) => isNum(n) && n > 0) &&
    isNum(x.rotation) && typeof x.color === "string"
  );
}

export function isValidDesign(d: unknown): d is Design {
  const x = d as Design;
  return !!x && typeof x.id === "string" && typeof x.name === "string" && !!x.room && Array.isArray(x.items) &&
    [x.room.length, x.room.width, x.room.height].every((n) => isNum(n) && n > 0) &&
    typeof x.room.wallColor === "string" && typeof x.room.floorColor === "string" &&
    x.items.every(isValidItem);
}

export const DEFAULT_ROOM: Room = { length: 5, width: 6, height: 2.8, wallColor: "#efe6d8", floorColor: "#b98a5e" };

export function exampleDesigns(): Design[] {
  const t = 0;
  const p = (type: FurnitureType, x: number, z: number, r = 0) => ({ ...makeItem(type, x, z), rotation: r });
  return [
    { id: "ex-bedroom", name: "Calm Bedroom", updatedAt: t, room: { length: 4.5, width: 4, height: 2.7, wallColor: "#e3e8e0", floorColor: "#c9a77c" },
      items: [p("bed", 0, -1.1), p("wardrobe", -1.35, 1.9, Math.PI), p("lamp", 1.4, -1.9), p("plant", 1.6, 1.8)] },
    { id: "ex-living", name: "Warm Living Room", updatedAt: t, room: { length: 5, width: 6, height: 2.9, wallColor: "#f1e7d6", floorColor: "#9c7048" },
      items: [p("sofa", 0, -1.9), p("table", 0, -0.4), p("lamp", -2.4, -2), p("plant", 2.5, -2), p("chair", 1.6, 0.6, -Math.PI / 2)] },
    { id: "ex-studio", name: "Minimal Studio", updatedAt: t, room: { length: 4, width: 5, height: 2.6, wallColor: "#f5f5f0", floorColor: "#d8c7aa" },
      items: [p("desk", 0, -1.6), p("chair", 0, -0.9, Math.PI), p("plant", -2, -1.6), p("bed", 1.6, 0.9, Math.PI / 2)] },
  ];
}
