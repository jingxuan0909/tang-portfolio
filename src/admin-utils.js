// Returns a Storage object path only for files owned by this Supabase project.
export function storagePathFromPublicUrl(value, projectUrl = import.meta.env.VITE_SUPABASE_URL) {
  if (!value || !projectUrl) return "";

  try {
    const fileUrl = new URL(value);
    const supabaseOrigin = new URL(projectUrl).origin;
    const prefix = "/storage/v1/object/public/portfolio-files/";

    if (fileUrl.origin !== supabaseOrigin || !fileUrl.pathname.startsWith(prefix)) return "";
    return decodeURIComponent(fileUrl.pathname.slice(prefix.length));
  } catch {
    // Local /uploads paths and malformed/external URLs must never be deleted here.
    return "";
  }
}

// Finds every Supabase Storage URL still referenced anywhere in a content document.
export function collectReferencedStorageUrls(value, projectUrl = import.meta.env.VITE_SUPABASE_URL, found = new Set()) {
  if (typeof value === "string") {
    if (storagePathFromPublicUrl(value, projectUrl)) found.add(value);
    return found;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectReferencedStorageUrls(item, projectUrl, found));
    return found;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectReferencedStorageUrls(item, projectUrl, found));
  }

  return found;
}

// Compares the editable draft with the last content confirmed by Supabase.
export function hasContentChanged(draft, savedContent) {
  if (!draft || !savedContent) return false;
  return JSON.stringify(draft) !== JSON.stringify(savedContent);
}

// Converts the Admin comma-separated Technologies field into clean tags.
export function parseTechnologies(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
