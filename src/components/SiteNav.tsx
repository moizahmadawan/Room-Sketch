import { Link, useNavigate } from "@tanstack/react-router";
import { Home, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const links = [
  { to: "/editor", label: "Editor" },
  { to: "/designs", label: "My Designs" },
  { to: "/explore", label: "Explore" },
  { to: "/settings", label: "Settings" },
] as const;

const linkClass = "rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground";

export function SiteNav() {
  const { user, ready, signOut } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await signOut();
      toast.success("Signed out");
      navigate({ to: "/" });
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <Link to="/" className="font-display text-xl font-semibold" aria-label="RoomSketch home">
          Room<span className="text-primary">Sketch</span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm">
          <Link to="/" activeOptions={{ exact: true }} className={`${linkClass} inline-flex items-center gap-1.5`}
            activeProps={{ className: "bg-muted text-foreground" }}>
            <Home className="h-4 w-4" aria-hidden /> Home
          </Link>
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={linkClass} activeProps={{ className: "bg-muted text-foreground" }}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 text-sm">
          {!ready ? (
            <span className="h-8 w-24" aria-hidden />
          ) : user ? (
            <>
              <span className="hidden items-center gap-1.5 text-muted-foreground sm:inline-flex" title={user.email}>
                <UserRound className="h-4 w-4" aria-hidden /> {user.name}
              </span>
              <Button size="sm" variant="outline" onClick={logout}>
                <LogOut className="h-4 w-4" aria-hidden /> Log out
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" asChild><Link to="/login" search={{}}>Log in</Link></Button>
              <Button size="sm" asChild><Link to="/signup" search={{}}>Sign up</Link></Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
