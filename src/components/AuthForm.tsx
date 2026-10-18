import { Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthError, resetPassword, useAuth } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/firebase";
import { safeRedirect } from "@/lib/redirect";

export function AuthForm({ mode, redirect }: { mode: "login" | "signup"; redirect?: string | undefined }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isSignup && password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const user = isSignup ? await signUp({ name, email, password, remember }) : await signIn({ email, password, remember });
      toast.success(isSignup ? `Welcome, ${user.name}!` : `Welcome back, ${user.name}!`);
      router.history.push(safeRedirect(redirect));
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    try {
      await resetPassword(email);
      toast.success("If an account exists for that email, a reset link is on its way.");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Could not send the reset email.");
    }
  };

  return (
    <div className="min-h-screen">
      <SiteNav />
      <div className="mx-auto max-w-md px-5 py-12">
        <h1 className="text-4xl">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignup ? "Your designs are saved to your account, separate from everyone else's." : "Log in to open your saved designs."}
        </p>

        {redirect && (
          <p className="mt-6 rounded-md bg-secondary/60 px-3 py-2 text-sm">
            {isSignup ? "Create an account" : "Log in"} to continue — your current design will be kept.
          </p>
        )}

        {!firebaseConfigured && (
          <p role="alert" className="mt-6 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Firebase is not configured yet. Copy <code>.env.example</code> to <code>.env</code>, fill in your Firebase values and restart.
          </p>
        )}

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border bg-card p-6" noValidate>
          {isSignup && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} required />
            {isSignup && <p className="text-xs text-muted-foreground">At least 8 characters, with a letter and a number.</p>}
          </div>
          {isSignup && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Keep me signed in
            </label>
            {!isSignup && <button type="button" onClick={forgot} className="text-sm text-primary underline">Forgot password?</button>}
          </div>

          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignup ? (
            <>Already have an account? <Link to="/login" search={redirect ? { redirect } : {}} className="text-primary underline">Log in</Link></>
          ) : (
            <>New to RoomSketch? <Link to="/signup" search={redirect ? { redirect } : {}} className="text-primary underline">Create an account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
