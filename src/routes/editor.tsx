import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Home, Lock, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { RoomScene } from "@/components/room/RoomScene";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { CATALOG, LIMITS, clamp, exampleDesigns, uid } from "@/lib/room";
import { getDesign, useEditor } from "@/lib/store";

export const Route = createFileRoute("/editor")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { id?: string | undefined; example?: string | undefined; save?: string | undefined } => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
    example: typeof s["example"] === "string" ? s["example"] : undefined,
    save: typeof s["save"] === "string" ? s["save"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Editor — RoomSketch" },
      { name: "description", content: "Design your room in 3D: set dimensions, colors and arrange furniture." },
      { property: "og:title", content: "Editor — RoomSketch" },
      { property: "og:description", content: "Design your room in 3D right in your browser." },
    ],
  }),
  component: Editor,
});

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Gate = "save" | "export" | "print";
const GATE_TEXT: Record<Gate, string> = { save: "save your design", export: "export a PNG", print: "print your design" };

function Editor() {
  const { id } = Route.useSearch();
  // Guests can design freely. Only opening a design saved in someone's account needs a login.
  return id ? (
    <RequireAuth>
      <EditorInner />
    </RequireAuth>
  ) : (
    <EditorInner />
  );
}

function EditorInner() {
  const { id, example, save: saveParam } = Route.useSearch();
  const navigate = useNavigate();
  const user = useAuth((a) => a.user);
  const userId = user?.id;
  const [gate, setGate] = useState<Gate | null>(null);
  const s = useEditor();
  const sel = s.items.find((i) => i.id === s.selected);

  // Open a saved design (only from THIS user's cloud library) or a copy of an example.
  useEffect(() => {
    let cancelled = false;
    if (id && userId) {
      getDesign(userId, id)
        .then((d) => {
          if (cancelled) return;
          if (d) useEditor.getState().load(d);
          else toast.error("That design was not found in your account.");
        })
        .catch(() => { if (!cancelled) toast.error("Could not load that design. Check your connection."); });
    } else if (example) {
      const d = exampleDesigns().find((d) => d.id === example);
      if (d) useEditor.getState().load({ ...d, id: uid(), name: d.name + " (copy)" });
    }
    return () => { cancelled = true; };
  }, [id, example, userId]);

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const doSave = async () => {
    if (!useAuth.getState().user) { setGate("save"); return; }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (await useEditor.getState().save()) toast.success("Design saved to your account");
      else toast.error("Please log in to save.");
    } catch {
      toast.error("Could not save. Check your connection and try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // Coming back from "log in to save": save the guest's design automatically, once.
  const autoSaved = useRef(false);
  useEffect(() => {
    if (saveParam !== "1" || !userId || autoSaved.current) return;
    autoSaved.current = true;
    // Only if there is a draft with changes (a page reload in between would have lost it).
    const draft = useEditor.getState().dirty ? doSave() : Promise.resolve();
    draft.finally(() => navigate({ to: "/editor", search: {}, replace: true }));
  }, [saveParam, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Runs `action` for signed-in users; guests get a friendly "log in first" dialog instead. */
  const needLogin = (what: Gate, action: () => void) => {
    if (useAuth.getState().user) action();
    else setGate(what);
  };

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!s.dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [s.dirty]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const st = useEditor.getState();
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && key === "s") { e.preventDefault(); doSave(); return; }
      if (mod && key === "z") { e.preventDefault(); if (e.shiftKey) st.redo(); else st.undo(); return; }
      if (mod && key === "y") { e.preventDefault(); st.redo(); return; }
      if (mod || e.altKey || !st.selected) return;
      if (key === "delete" || key === "backspace") { e.preventDefault(); st.remove(st.selected); }
      if (key === "r") {
        const it = st.items.find((i) => i.id === st.selected);
        if (it) st.update(it.id, { rotation: it.rotation + Math.PI / 2 });
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const exportPng = () => needLogin("export", () => {
    const c = document.querySelector("canvas");
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `${s.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  });

  const printDesign = () => needLogin("print", () => {
    const c = document.querySelector("canvas");
    if (!c) return;
    const st = useEditor.getState();
    const w = window.open("", "_blank");
    if (!w) { toast.error("Please allow pop-ups to print."); return; }
    const rows = st.items.map((i) => `<li>${esc(i.name)} — ${i.size[0]} × ${i.size[2]} m</li>`).join("");
    w.document.write(`<!doctype html><title>${esc(st.name)}</title>
<style>body{font-family:system-ui,sans-serif;margin:16px;color:#222}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 12px;color:#555}
img{width:100%;border:1px solid #ddd;border-radius:8px}li{margin:2px 0}@page{margin:12mm}</style>
<h1>${esc(st.name)}</h1><p>${st.room.width} m × ${st.room.length} m × ${st.room.height} m · ${st.items.length} items</p>
<img src="${c.toDataURL("image/png")}" onload="setTimeout(function(){window.print()},200)"><ul>${rows}</ul>`);
    w.document.close();
  });

  const dim = (key: "length" | "width" | "height", v: string) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    const [mn, mx] = key === "height" ? [LIMITS.hMin, LIMITS.hMax] : [LIMITS.min, LIMITS.max];
    s.setRoom({ [key]: clamp(n, mn, mx) });
  };

  const cats = [...new Set(CATALOG.map((c) => c.category))];

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
        <Link to="/" className="font-display text-lg font-semibold" aria-label="RoomSketch home">Room<span className="text-primary">Sketch</span></Link>
        <Button size="sm" variant="outline" asChild>
          <Link to="/"><Home className="h-4 w-4" aria-hidden /> Home</Link>
        </Button>
        <Input aria-label="Design name" value={s.name} onChange={(e) => s.setName(e.target.value)} className="h-8 w-48" />
        {s.dirty && <span className="text-xs text-muted-foreground" role="status">● Unsaved changes</span>}
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" onClick={s.undo} disabled={!s.past.length}>Undo</Button>
          <Button size="sm" variant="ghost" onClick={s.redo} disabled={!s.future.length}>Redo</Button>
          <Button size="sm" variant="ghost" onClick={() => { if (!s.dirty || confirm("Start a new design? Unsaved changes will be lost.")) s.newDesign(); }}>New</Button>
          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Clear the room?")) s.reset(); }}>Reset</Button>
          <Button size="sm" variant="outline" onClick={exportPng}>{!user && <Lock className="h-3.5 w-3.5" aria-hidden />}Export PNG</Button>
          <Button size="sm" variant="outline" onClick={printDesign}>{!user ? <Lock className="h-3.5 w-3.5" aria-hidden /> : <Printer className="h-4 w-4" aria-hidden />}Print</Button>
          <Button size="sm" onClick={doSave} disabled={saving}>{!user && <Lock className="h-3.5 w-3.5" aria-hidden />}{saving ? "Saving…" : "Save"}</Button>
          <Button size="sm" variant="ghost" asChild><Link to="/designs">My Designs</Link></Button>
          {!user && <Button size="sm" variant="ghost" asChild><Link to="/login" search={{ redirect: "/editor" }}>Log in</Link></Button>}
        </div>
      </div>

      {!user && (
        <p className="border-b bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground">
          You are designing as a guest. <Link to="/signup" search={{ redirect: "/editor?save=1" }} className="text-primary underline">Create a free account</Link> or{" "}
          <Link to="/login" search={{ redirect: "/editor?save=1" }} className="text-primary underline">log in</Link> to save, export or print.
        </p>
      )}

      <AlertDialog open={gate !== null} onOpenChange={(o) => { if (!o) setGate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log in to {gate ? GATE_TEXT[gate] : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              You can design as a guest, but saving, exporting and printing need a free account. Your current design stays here while you sign in
              {gate === "save" ? " and will be saved automatically afterwards." : "."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep designing</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link to="/signup" search={{ redirect: gate === "save" ? "/editor?save=1" : "/editor" }}>Create account</Link>
            </AlertDialogAction>
            <AlertDialogAction asChild>
              <Link to="/login" search={{ redirect: gate === "save" ? "/editor?save=1" : "/editor" }}>Log in</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="order-2 flex gap-4 overflow-auto border-t bg-card p-3 md:order-1 md:w-56 md:flex-col md:border-r md:border-t-0">
          {cats.map((cat) => (
            <div key={cat} className="min-w-40">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</p>
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1">
                {CATALOG.filter((c) => c.category === cat).map((c) => (
                  <button key={c.type} onClick={() => s.add(c.type)}
                    className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-left text-sm hover:border-primary">
                    <span className="h-3 w-3 rounded-sm" style={{ background: c.color }} />{c.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <main className="relative order-1 min-h-[50vh] flex-1 bg-canvas md:order-2">
          <RoomScene room={s.room} items={s.items} selected={s.selected} onSelect={s.select}
            onMove={(id, x, z, first) => s.update(id, { position: [x, 0, z] }, first)} />
          <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-card/90 px-3 py-1.5 text-xs text-muted-foreground">
            {s.room.width}m × {s.room.length}m × {s.room.height}m · {s.items.length} items
            {sel && <> · <span className="text-foreground">{sel.name}</span> selected (drag to move, R rotate, Del delete)</>}
          </div>
        </main>

        <aside className="order-3 space-y-5 overflow-auto border-t bg-card p-4 md:w-64 md:border-l md:border-t-0">
          {sel ? (
            <section className="space-y-3">
              <h3 className="text-lg">{sel.name}</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => s.update(sel.id, { rotation: sel.rotation - Math.PI / 4 })}>⟲ 45°</Button>
                <Button size="sm" variant="outline" onClick={() => s.update(sel.id, { rotation: sel.rotation + Math.PI / 4 })}>⟳ 45°</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["X", "Z"] as const).map((ax, i) => (
                  <div key={ax}><Label className="text-xs">{ax} (m)</Label>
                    <Input type="number" step={0.1} value={(sel.position[i * 2] ?? 0).toFixed(2)} onChange={(e) => {
                      const n = Number(e.target.value);
                      if (e.target.value === "" || !Number.isFinite(n)) return;
                      const p = [...sel.position] as [number, number, number]; p[i * 2] = n; s.update(sel.id, { position: p });
                    }} /></div>
                ))}
              </div>
              <div><Label className="text-xs">Color</Label>
                <Input type="color" value={sel.color} onChange={(e) => s.update(sel.id, { color: e.target.value }, false)} className="h-9 p-1" /></div>
              <Button size="sm" variant="destructive" className="w-full" onClick={() => s.remove(sel.id)}>Delete</Button>
            </section>
          ) : <p className="text-sm text-muted-foreground">Click furniture to edit it.</p>}

          <section className="space-y-3 border-t pt-4">
            <h3 className="text-lg">Room</h3>
            {([["width", "Width"], ["length", "Length"], ["height", "Wall height"]] as const).map(([k, l]) => (
              <div key={k}><Label className="text-xs">{l} (m)</Label>
                <Input type="number" step={0.1} min={k === "height" ? LIMITS.hMin : LIMITS.min} max={k === "height" ? LIMITS.hMax : LIMITS.max}
                  defaultValue={s.room[k]} key={s.room[k]} onBlur={(e) => dim(k, e.target.value)} /></div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Walls</Label><Input type="color" value={s.room.wallColor} onChange={(e) => s.setRoom({ wallColor: e.target.value })} className="h-9 p-1" /></div>
              <div><Label className="text-xs">Floor</Label><Input type="color" value={s.room.floorColor} onChange={(e) => s.setRoom({ floorColor: e.target.value })} className="h-9 p-1" /></div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
