import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthError, useAuth } from "@/lib/auth";
import { isValidDesign, type Design } from "@/lib/room";
import { deleteAllDesigns, loadDesigns, saveDesigns } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — RoomSketch" },
      { name: "description", content: "Your RoomSketch account, password and saved data." },
      { property: "og:title", content: "Settings — RoomSketch" },
      { property: "og:description", content: "Manage your RoomSketch account and saved data." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  );
}

const errMsg = (e: unknown) => (e instanceof AuthError ? e.message : "Something went wrong.");

function Settings() {
  const { user, updateName, changePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [delPw, setDelPw] = useState("");
  if (!user) return null;

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    try { await updateName(name); toast.success("Profile updated"); } catch (err) { toast.error(errMsg(err)); }
  };
  const savePw = async (e: FormEvent) => {
    e.preventDefault();
    try { await changePassword(oldPw, newPw); setOldPw(""); setNewPw(""); toast.success("Password changed"); } catch (err) { toast.error(errMsg(err)); }
  };

  const exportAll = async () => {
    try {
      const blob = new Blob([JSON.stringify(await loadDesigns(user.id), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "roomsketch-designs.json";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { toast.error("Could not export. Check your connection."); }
  };
  const importAll = async (file: File | undefined) => {
    if (!file) return;
    try {
      const raw: unknown = JSON.parse(await file.text());
      const valid = (Array.isArray(raw) ? raw : []).filter(isValidDesign) as Design[];
      if (!valid.length) return toast.error("No valid designs found in that file.");
      const have = new Set((await loadDesigns(user.id)).map((d) => d.id));
      const fresh = valid.filter((d) => !have.has(d.id));
      await saveDesigns(user.id, fresh);
      toast.success(`Imported ${fresh.length} design(s)`);
    } catch { toast.error("That file could not be read or saved."); }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="min-h-screen">
      <SiteNav />
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-4xl">Settings</h1>
        <div className="mt-8 space-y-4">
          <form onSubmit={saveName} className="rounded-xl border bg-card p-5">
            <h3 className="text-xl">Profile</h3>
            <p className="mt-1 text-sm text-muted-foreground">Signed in as {user.email}</p>
            <Label htmlFor="pname" className="mt-4 block text-xs">Name</Label>
            <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            <Button type="submit" className="mt-3">Save name</Button>
          </form>

          <form onSubmit={savePw} className="rounded-xl border bg-card p-5">
            <h3 className="text-xl">Change password</h3>
            <Label htmlFor="oldpw" className="mt-4 block text-xs">Current password</Label>
            <Input id="oldpw" type="password" autoComplete="current-password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} className="mt-1" />
            <Label htmlFor="newpw" className="mt-3 block text-xs">New password</Label>
            <Input id="newpw" type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="mt-1" />
            <Button type="submit" className="mt-3">Update password</Button>
          </form>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-xl">Units</h3>
            <p className="mt-1 text-sm text-muted-foreground">All measurements are in meters.</p>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-xl">Your data</h3>
            <p className="mt-1 text-sm text-muted-foreground">Your designs are stored securely in your account. You can also download a backup file.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportAll}>Export backup</Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>Import backup</Button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => importAll(e.target.files?.[0])} />
              <Button variant="destructive" onClick={async () => {
                if (!confirm("Delete all of your saved designs?")) return;
                try { await deleteAllDesigns(user.id); toast.success("All designs cleared"); } catch { toast.error("Could not clear designs."); }
              }}>Clear saved designs</Button>
            </div>
          </div>

          <div className="rounded-xl border border-destructive/40 bg-card p-5">
            <h3 className="text-xl">Delete account</h3>
            <p className="mt-1 text-sm text-muted-foreground">Permanently removes your account and all of its designs.</p>
            <Input type="password" placeholder="Confirm with your password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} className="mt-3" />
            <Button variant="destructive" className="mt-3" onClick={async () => {
              if (!confirm("This cannot be undone. Delete your account?")) return;
              try {
                await deleteAccount(delPw, deleteAllDesigns);
                toast.success("Account deleted");
                navigate({ to: "/" });
              } catch (err) { toast.error(errMsg(err)); }
            }}>Delete my account</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
