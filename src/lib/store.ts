import { create } from "zustand";
import { useAuth } from "./auth";
import { loadFirebase } from "./firebase";
import { DEFAULT_ROOM, clampToRoom, isValidDesign, makeItem, uid, type Design, type Furniture, type FurnitureType, type Room } from "./room";

/**
 * Designs live in Firestore, one document per design:  users/<uid>/designs/<designId>
 * `firestore.rules` only lets the signed-in owner read or write their own documents.
 */

async function designsRef(userId: string) {
  const h = await loadFirebase();
  return { ...h, col: h.F.collection(h.db, "users", userId, "designs") };
}

export async function loadDesigns(userId: string | null | undefined): Promise<Design[]> {
  if (!userId) return [];
  const { F, col } = await designsRef(userId);
  const snap = await F.getDocs(col);
  return snap.docs.map((d) => d.data()).filter(isValidDesign).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDesign(userId: string, id: string): Promise<Design | null> {
  const { F, db } = await loadFirebase();
  const snap = await F.getDoc(F.doc(db, "users", userId, "designs", id));
  const d = snap.data();
  return isValidDesign(d) ? d : null;
}

export async function saveDesign(userId: string, d: Design) {
  const { F, db } = await loadFirebase();
  await F.setDoc(F.doc(db, "users", userId, "designs", d.id), d);
}

/** Writes many designs at once (batches of 400, Firestore's limit is 500). */
export async function saveDesigns(userId: string, list: Design[]) {
  const { F, db } = await loadFirebase();
  for (let i = 0; i < list.length; i += 400) {
    const batch = F.writeBatch(db);
    for (const d of list.slice(i, i + 400)) batch.set(F.doc(db, "users", userId, "designs", d.id), d);
    await batch.commit();
  }
}

export async function deleteDesign(userId: string, id: string) {
  const { F, db } = await loadFirebase();
  await F.deleteDoc(F.doc(db, "users", userId, "designs", id));
}

export async function deleteAllDesigns(userId: string) {
  const { F, db, col } = await designsRef(userId);
  const snap = await F.getDocs(col);
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = F.writeBatch(db);
    for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref);
    await batch.commit();
  }
}

/* ---- designs saved in this browser by older versions (before accounts) ---- */

const isLegacyKey = (k: string) => k === "roomsketch.designs" || k.startsWith("roomsketch.designs.");

export function readLegacyDesigns(): Design[] {
  if (typeof window === "undefined") return [];
  const byId = new Map<string, Design>();
  for (const k of Object.keys(localStorage).filter(isLegacyKey)) {
    try {
      const raw = JSON.parse(localStorage.getItem(k) || "[]");
      if (Array.isArray(raw)) for (const d of raw.filter(isValidDesign)) byId.set(d.id, d);
    } catch {
      /* ignore corrupt data */
    }
  }
  return [...byId.values()];
}

export function clearLegacyDesigns() {
  for (const k of Object.keys(localStorage).filter(isLegacyKey)) localStorage.removeItem(k);
}

type Snap = { room: Room; items: Furniture[] };

interface EditorState {
  id: string; name: string; room: Room; items: Furniture[];
  selected: string | null;
  dirty: boolean;
  past: Snap[]; future: Snap[];
  load: (d: Design) => void;
  newDesign: () => void;
  reset: () => void;
  setName: (n: string) => void;
  setRoom: (r: Partial<Room>) => void;
  add: (t: FurnitureType) => void;
  update: (id: string, p: Partial<Furniture>, record?: boolean) => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
  checkpoint: () => void;
  undo: () => void; redo: () => void;
  /** Saves into the signed-in user's library. Returns false when nobody is signed in. */
  save: () => Promise<boolean>;
}

export const useEditor = create<EditorState>((set, get) => {
  const snap = (): Snap => ({ room: get().room, items: get().items });
  const record = () => set((s) => ({ past: [...s.past.slice(-49), snap()], future: [], dirty: true }));
  return {
    id: uid(), name: "Untitled room", room: DEFAULT_ROOM, items: [], selected: null, dirty: false, past: [], future: [],
    load: (d) => set({ id: d.id, name: d.name, room: d.room, items: d.items, selected: null, dirty: false, past: [], future: [] }),
    newDesign: () => set({ id: uid(), name: "Untitled room", room: DEFAULT_ROOM, items: [], selected: null, dirty: false, past: [], future: [] }),
    reset: () => { record(); set({ items: [], room: DEFAULT_ROOM, selected: null }); },
    setName: (name) => set({ name, dirty: true }),
    setRoom: (r) => { record(); set((s) => {
      const room = { ...s.room, ...r };
      return { room, items: s.items.map((i) => ({ ...i, position: clampToRoom(i, room) })) };
    }); },
    add: (t) => { record(); const it = makeItem(t); set((s) => ({ items: [...s.items, it], selected: it.id })); },
    update: (id, p, rec = true) => { if (rec) record(); else set({ dirty: true }); set((s) => ({ items: s.items.map((i) => {
      if (i.id !== id) return i;
      const n = { ...i, ...p };
      return { ...n, position: clampToRoom(n, s.room) };
    }) })); },
    remove: (id) => { record(); set((s) => ({ items: s.items.filter((i) => i.id !== id), selected: null })); },
    select: (selected) => set({ selected }),
    checkpoint: record,
    undo: () => { const { past } = get(); if (!past.length) return; const prev = past[past.length - 1]!;
      set((s) => ({ past: past.slice(0, -1), future: [snap(), ...s.future], ...prev, selected: null, dirty: true })); },
    redo: () => { const { future } = get(); if (!future.length) return; const nxt = future[0]!;
      set((s) => ({ future: future.slice(1), past: [...s.past, snap()], ...nxt, selected: null, dirty: true })); },
    save: async () => {
      const user = useAuth.getState().user;
      if (!user) return false;
      const { id, name, room, items } = get();
      await saveDesign(user.id, { id, name: name.trim() || "Untitled room", room, items, updatedAt: Date.now() });
      set({ dirty: false });
      return true;
    },
  };
});

// Data isolation: when a signed-in user logs out or the account switches, wipe the in-memory editor so
// one user's design never shows up for the next person. A guest who logs in KEEPS their draft.
if (typeof window !== "undefined") {
  useAuth.subscribe((state, prev) => {
    if (prev.user && state.user?.id !== prev.user.id) useEditor.getState().newDesign();
  });
}
