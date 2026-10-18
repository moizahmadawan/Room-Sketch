import { describe, expect, it } from "vitest";
import { clampToRoom, isValidDesign, makeItem, DEFAULT_ROOM } from "@/lib/room";

describe("room rules", () => {
  it("keeps furniture inside the room", () => {
    const bed = { ...makeItem("bed"), position: [99, 0, -99] as [number, number, number] };
    const [x, , z] = clampToRoom(bed, { ...DEFAULT_ROOM, width: 4, length: 4 });
    expect(x).toBeCloseTo(2 - 0.8);
    expect(z).toBeCloseTo(-(2 - 1.05));
  });
  it("rejects malformed saved designs", () => {
    expect(isValidDesign({ id: "a", name: "x", room: { length: -1, width: 2, height: 2 }, items: [] })).toBe(false);
  });
  it("accounts for rotation when a piece is turned 45°", () => {
    const sofa = { ...makeItem("sofa"), rotation: Math.PI / 4, position: [99, 0, 0] as [number, number, number] };
    const [x] = clampToRoom(sofa, { ...DEFAULT_ROOM, width: 6, length: 6 });
    const half = (Math.SQRT1_2 * (2 + 0.9)) / 2;
    expect(x).toBeCloseTo(3 - half);
  });
  it("rejects designs with broken furniture", () => {
    const ok = { id: "a", name: "x", updatedAt: 1, room: DEFAULT_ROOM, items: [makeItem("bed")] };
    expect(isValidDesign(ok)).toBe(true);
    expect(isValidDesign({ ...ok, items: [{ id: "z", type: "ufo" }] })).toBe(false);
  });
});
