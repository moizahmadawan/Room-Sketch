import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import hero from "@/assets/hero-room.jpg";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RoomSketch — 3D Room Planner in your browser" },
      { name: "description", content: "Design rooms in 3D: set dimensions, pick colors, arrange furniture, save and export. Free, no install." },
      { property: "og:title", content: "RoomSketch — 3D Room Planner" },
      { property: "og:description", content: "Plan your room layout in 3D, right in your browser." },
    ],
  }),
  component: Index,
});

const features = [
  ["Real dimensions", "Set length, width and wall height in meters."],
  ["Furniture library", "Beds, sofas, desks, lamps, plants and more."],
  ["Drag & rotate", "Move pieces on the floor, rotate, recolor, delete."],
  ["Save & export", "Your designs are saved to your account. Export a PNG any time."],
];

function Index() {
  const { user, ready } = useAuth();
  return (
    <div className="min-h-screen">
      <SiteNav />
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">3D room planner</p>
          <h1 className="text-5xl leading-[1.05] md:text-6xl">Try the sofa there<br />before you lift it.</h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">Sketch your room in 3D, drop in furniture, and play with layouts and colors — free, right in the browser.</p>
          {ready && user && <p className="mt-4 text-sm text-muted-foreground">Welcome back, <span className="font-semibold text-foreground">{user.name}</span>.</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <>
                <Button size="lg" asChild><Link to="/editor" search={{}}>Start designing</Link></Button>
                <Button size="lg" variant="outline" asChild><Link to="/designs">My designs</Link></Button>
              </>
            ) : (
              <>
                <Button size="lg" asChild><Link to="/login" search={{}}>Log in</Link></Button>
                <Button size="lg" variant="outline" asChild><Link to="/explore">See examples</Link></Button>
              </>
            )}
          </div>
        </div>
        <img src={hero} width={1280} height={960} alt="Isometric 3D living room with terracotta sofa" className="w-full rounded-2xl" />
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(([t, d]) => (
          <div key={t} className="rounded-xl border bg-card p-5">
            <h3 className="text-xl">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <section className="border-y bg-secondary/50">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-3xl">How it works</h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {["Set your room's size and colors.", "Add furniture from the library and drag it into place.", "Sign in, save the design to your account, or export a snapshot to share."].map((s, i) => (
              <li key={i} className="flex gap-4"><span className="font-display text-4xl text-primary">{i + 1}</span><p className="pt-2">{s}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl justify-between px-5 py-8 text-sm text-muted-foreground">
        <span>© RoomSketch</span>
        <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a>
      </footer>
    </div>
  );
}
