// Verifies safe Storage paths, content comparison, technology parsing, and date sorting.
import { describe, expect, it } from "vitest";
import { collectReferencedStorageUrls, hasContentChanged, parseTechnologies, storagePathFromPublicUrl } from "../src/admin-utils";
import { sortRecent } from "../src/content-utils";

const projectUrl = "https://example-ref.supabase.co";

describe("Admin content utilities", () => {
  it("deletes only files owned by the portfolio-files bucket", () => {
    expect(storagePathFromPublicUrl(`${projectUrl}/storage/v1/object/public/portfolio-files/2026/logo.png`, projectUrl)).toBe("2026/logo.png");
    expect(storagePathFromPublicUrl("/uploads/legacy.pdf", projectUrl)).toBe("");
    expect(storagePathFromPublicUrl("https://other.example/file.pdf", projectUrl)).toBe("");
  });

  it("finds referenced Supabase files inside nested content", () => {
    const owned = `${projectUrl}/storage/v1/object/public/portfolio-files/2026/cert.pdf`;
    const found = collectReferencedStorageUrls({ profile: { portraitUrl: owned }, awards: [{ url: "/uploads/legacy.pdf" }] }, projectUrl);
    expect([...found]).toEqual([owned]);
  });

  it("detects draft changes and parses comma-separated technologies", () => {
    expect(hasContentChanged({ name: "New" }, { name: "Old" })).toBe(true);
    expect(hasContentChanged({ name: "Same" }, { name: "Same" })).toBe(false);
    expect(parseTechnologies("React, Supabase,  Vite")).toEqual(["React", "Supabase", "Vite"]);
  });

  it("sorts current and newer experience before older records", () => {
    const sorted = sortRecent([{ period: "March 2025" }, { period: "Present" }, { period: "January 2024" }]);
    expect(sorted.map((item) => item.period)).toEqual(["Present", "March 2025", "January 2024"]);
  });
});
