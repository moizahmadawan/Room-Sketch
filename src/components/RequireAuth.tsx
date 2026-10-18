import { Navigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

/** Wrap any page that needs a signed-in user. Guests are sent to /login and come back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground" role="status">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" search={{ redirect: location.href }} replace />;
  return <>{children}</>;
}
