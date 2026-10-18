import { beforeEach, describe, expect, it } from "vitest";
import { AuthError, isValidEmail, mapAuthError, normalizeEmail, passwordProblem } from "@/lib/auth";
import { FirebaseNotConfiguredError } from "@/lib/firebase";
import { safeRedirect } from "@/lib/redirect";
import { clearLegacyDesigns, readLegacyDesigns } from "@/lib/store";
import { DEFAULT_ROOM, makeItem, type Design } from "@/lib/room";

const design = (id: string): Design => ({ id, name: id, updatedAt: 1, room: DEFAULT_ROOM, items: [makeItem("bed")] });

beforeEach(() => localStorage.clear());

describe("validation", () => {
  it("checks emails and passwords", () => {
    expect(normalizeEmail("  Ali@Example.COM ")).toBe("ali@example.com");
    expect(isValidEmail("x@y.zz")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(passwordProblem("short1")).toMatch(/8 characters/);
    expect(passwordProblem("onlyletters")).toMatch(/number/);
    expect(passwordProblem("12345678")).toMatch(/letter/);
    expect(passwordProblem("password1")).toBeNull();
  });
});

describe("error messages", () => {
  it("turns Firebase codes into friendly text", () => {
    expect(mapAuthError({ code: "auth/email-already-in-use" }).message).toMatch(/already exists/);
    expect(mapAuthError({ code: "auth/invalid-credential" }).message).toBe("Incorrect email or password.");
    expect(mapAuthError({ code: "auth/user-not-found" }).message).toBe("Incorrect email or password.");
    expect(mapAuthError({ code: "auth/network-request-failed" }).message).toMatch(/Network/);
    expect(mapAuthError({ code: "something-new" })).toBeInstanceOf(AuthError);
    expect(mapAuthError(new FirebaseNotConfiguredError()).message).toMatch(/not configured/);
  });
});

describe("designs saved before accounts", () => {
  it("are found in local storage and can be cleared", () => {
    localStorage.setItem("roomsketch.designs", JSON.stringify([design("a")]));
    localStorage.setItem("roomsketch.designs.u_1", JSON.stringify([design("a"), design("b")]));
    localStorage.setItem("roomsketch.designs.u_2", "not json");
    expect(readLegacyDesigns().map((d) => d.id).sort()).toEqual(["a", "b"]);
    clearLegacyDesigns();
    expect(readLegacyDesigns()).toEqual([]);
  });
});

describe("safeRedirect", () => {
  it("only allows same-site paths", () => {
    expect(safeRedirect("/editor?id=1")).toBe("/editor?id=1");
    expect(safeRedirect("//evil.com")).toBe("/designs");
    expect(safeRedirect("https://evil.com")).toBe("/designs");
    expect(safeRedirect("/login")).toBe("/designs");
    expect(safeRedirect(undefined)).toBe("/designs");
  });
});
