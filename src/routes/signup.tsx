import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign up — RoomSketch" },
      { name: "description", content: "Create a free RoomSketch account to save your room designs." },
    ],
  }),
  component: Page,
});

function Page() {
  const { redirect } = Route.useSearch();
  return <AuthForm mode="signup" redirect={redirect} />;
}
