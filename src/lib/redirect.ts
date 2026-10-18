/** Only allow same-site paths as post-login targets (blocks open redirects like //evil.com). */
export function safeRedirect(to: string | undefined | null, fallback = "/designs"): string {
  if (!to || !to.startsWith("/") || to.startsWith("//") || to.includes("\\")) return fallback;
  if (to === "/login" || to.startsWith("/login?") || to === "/signup" || to.startsWith("/signup?")) return fallback;
  return to;
}
