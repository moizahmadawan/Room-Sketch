import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { uid, type Design } from "@/lib/room";
import { clearLegacyDesigns, deleteDesign, loadDesigns, readLegacyDesigns, saveDesign, saveDesigns, useEditor } from "@/lib/store";

export const Route = createFileRoute("/designs")({
  head: () => ({
    meta: [
      { title: "My Designs — RoomSketch" },
      { name: "description", content: "Your saved RoomSketch room designs." },
      { property: "og:title", content: "My Designs — RoomSketch" },
      { property: "og:description", content: "Open, rename, duplicate or delete your saved rooms." },
    ],
  }),
  component: DesignsPage,
});

function DesignsPage() {
  return (
    <RequireAuth>
      <Designs />
    </RequireAuth>
  );
}

type Sort = "recent" | "name" | "items";

function Designs() {
  const user = useAuth((a) => a.user)!;
  const [list, setList] = useState<Design[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [legacy, setLegacy] = useState<Design[]>([]);

  const refresh = () => {
    setStatus("loading");
    loadDesigns(user.id).then((l) => { setList(l); setStatus("ready"); }).catch(() => setStatus("error"));
  };
  useEffect(() => { refresh(); setLegacy(readLegacyDesigns()); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Runs a cloud write, then updates the screen; shows a toast if the write fails. */
  const run = async (write: () => Promise<void>, next: Design[], ok?: string) => {
    try { await write(); setList(next); if (ok) toast.success(ok); } catch { toast.error("That did not work. Check your connection and try again."); }
  };

  const importLegacy = async () => {
    try {
      const have = new Set(list.map((d) => d.id));
      await saveDesigns(user.id, legacy.filter((d) => !have.has(d.id)));
      clearLegacyDesigns();
      toast.success(`Moved ${legacy.length} design(s) to your account`);
      setLegacy([]);
      refresh();
    } catch { toast.error("Import failed. Please try again."); }
  };

  const shown = useMemo(() => {
    const f = list.filter((d) => d.name.toLowerCase().includes(q.trim().toLowerCase()));
    return f.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "items" ? b.items.length - a.items.length : b.updatedAt - a.updatedAt);
  }, [list, q, sort]);

  return (
    <div className="min-h-screen">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-4xl">My Designs</h1>
            <p className="mt-2 text-sm text-muted-foreground">Saved to your account ({user.email}) and available on any device you log in from.</p>
          </div>
          <Button asChild>
            <Link to="/editor" search={{}} onClick={() => useEditor.getState().newDesign()}>New design</Link>
          </Button>
        </div>

        {legacy.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-secondary/50 p-4 text-sm">
            <span>Found {legacy.length} design(s) saved on this device before accounts existed.</span>
            <Button size="sm" onClick={importLegacy}>Move to my account</Button>
          </div>
        )}

        {list.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Input aria-label="Search designs" placeholder="Search designs…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            <select aria-label="Sort designs" value={sort} onChange={(e) => setSort(e.target.value as Sort)}
              className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="recent">Recently updated</option>
              <option value="name">Name (A–Z)</option>
              <option value="items">Most furniture</option>
            </select>
          </div>
        )}

        {status === "loading" ? (
          <p className="mt-10 text-center text-muted-foreground" role="status">Loading your designs…</p>
        ) : status === "error" ? (
          <div className="mt-10 rounded-xl border border-destructive/40 p-8 text-center">
            <p className="text-destructive">Could not load your designs.</p>
            <Button className="mt-3" variant="outline" onClick={refresh}>Try again</Button>
          </div>
        ) : list.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed p-10 text-center text-muted-foreground">No saved designs yet. Create one in the editor and press Save.</p>
        ) : shown.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">No designs match “{q}”.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((d) => (
              <div key={d.id} className="rounded-xl border bg-card p-5">
                <div className="mb-3 h-20 rounded-md" style={{ background: `linear-gradient(to bottom, ${d.room.wallColor} 55%, ${d.room.floorColor} 55%)` }} />
                <h3 className="text-xl">{d.name}</h3>
                <p className="text-xs text-muted-foreground">{d.items.length} items · updated {new Date(d.updatedAt).toLocaleString()}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Button size="sm" asChild><Link to="/editor" search={{ id: d.id }}>Open</Link></Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const n = prompt("New name", d.name)?.trim();
                    if (n) { const u = { ...d, name: n, updatedAt: Date.now() }; run(() => saveDesign(user.id, u), list.map((x) => x.id === d.id ? u : x)); }
                  }}>Rename</Button>
                  <Button size="sm" variant="outline" onClick={() => { const c = { ...d, id: uid(), name: d.name + " copy", updatedAt: Date.now() }; run(() => saveDesign(user.id, c), [c, ...list], "Duplicated"); }}>Duplicate</Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${d.name}"?`)) run(() => deleteDesign(user.id, d.id), list.filter((x) => x.id !== d.id), "Deleted"); }}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
