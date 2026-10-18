import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { exampleDesigns } from "@/lib/room";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Designs — RoomSketch" },
      { name: "description", content: "Example bedroom, living room and studio layouts to start from." },
      { property: "og:title", content: "Explore Designs — RoomSketch" },
      { property: "og:description", content: "Open an example room layout in the 3D editor." },
    ],
  }),
  component: Explore,
});

function Explore() {
  return (
    <div className="min-h-screen">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="text-4xl">Explore designs</h1>
        <p className="mt-2 text-muted-foreground">Start from an example and make it yours.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exampleDesigns().map((d) => (
            <div key={d.id} className="rounded-xl border bg-card p-5">
              <div className="mb-3 h-28 rounded-md" style={{ background: `linear-gradient(to bottom, ${d.room.wallColor} 55%, ${d.room.floorColor} 55%)` }} />
              <h3 className="text-xl">{d.name}</h3>
              <p className="text-xs text-muted-foreground">{d.room.width}m × {d.room.length}m · {d.items.length} pieces</p>
              <Button size="sm" className="mt-4" asChild><Link to="/editor" search={{ example: d.id }}>Open in editor</Link></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
