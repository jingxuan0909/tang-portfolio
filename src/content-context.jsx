import { createContext, useContext, useEffect, useMemo, useState } from "react";
import initialContent from "../data/content.json";
import { supabase } from "./supabase";

const ContentContext = createContext(null);

// Adds a visible flag to older records that were created before hiding was supported.
function withItemVisibility(items = []) {
  return items.map((item) => ({ ...item, visible: item.visible !== false }));
}

// Keeps the latest local project copy available for migrating older database records.
const canonicalProjectsByTitle = new Map(
  initialContent.projects.map((project) => [project.title.toLowerCase(), project]),
);
const canonicalExperienceByCompany = new Map(
  initialContent.experience.map((item) => [item.company.toLowerCase(), item]),
);

// Upgrades one saved project while preserving its database ID and uploaded logo.
function mergeProject(project) {
  const canonicalProject = canonicalProjectsByTitle.get(project.title?.toLowerCase());

  // Existing Supabase projects predate separate Home and Projects-page copy.
  // Migrate those records once, while preserving uploaded logos and database IDs.
  if (canonicalProject && !project.shortDescription) {
    return {
      ...project,
      shortDescription: canonicalProject.shortDescription,
      description: canonicalProject.description,
      tech: canonicalProject.tech,
      url: canonicalProject.url,
    };
  }

  return {
    ...project,
    shortDescription: project.shortDescription || project.description || "",
  };
}

// Repairs the previously truncated Simply Data sentence from older saved content.
function mergeExperience(item) {
  const canonicalItem = canonicalExperienceByCompany.get(item.company?.trim().toLowerCase());
  const description = item.description?.trim() || "";
  if (canonicalItem && /communicated\s*$/i.test(description)) {
    return { ...item, description: canonicalItem.description };
  }
  return item;
}

// Combines Supabase content with safe local defaults for any missing fields.
function mergeWithDefaults(savedContent) {
  if (!savedContent) return initialContent;
  return {
    ...initialContent,
    ...savedContent,
    profile: { ...initialContent.profile, ...savedContent.profile },
    about: { ...initialContent.about, ...savedContent.about },
    currentEmployment: { ...initialContent.currentEmployment, ...savedContent.currentEmployment },
    sectionVisibility: { ...initialContent.sectionVisibility, ...savedContent.sectionVisibility },
    contact: { ...initialContent.contact, ...savedContent.contact },
    semesterResults: withItemVisibility(savedContent.semesterResults || initialContent.semesterResults),
    projects: (savedContent.projects || initialContent.projects).map(mergeProject),
    experience: withItemVisibility(savedContent.experience || initialContent.experience).map(mergeExperience),
    extraCurricularActivities: withItemVisibility(savedContent.extraCurricularActivities || initialContent.extraCurricularActivities),
  };
}

export function ContentProvider({ children }) {
  // Content starts empty so pages can show a loading screen during the first request.
  const [content, setContent] = useState(null);
  const [error, setError] = useState("");

  // Reloads the single portfolio_content row from Supabase.
  async function refresh() {
    try {
      if (!supabase) {
        setContent(initialContent);
        setError("Supabase is not configured yet.");
        return;
      }
      // The portfolio uses row ID 1 as its single editable content document.
      const { data, error: requestError } = await supabase
        .from("portfolio_content")
        .select("content")
        .eq("id", 1)
        .maybeSingle();
      if (requestError) throw requestError;
      setContent(mergeWithDefaults(data?.content));
      setError("");
    } catch (requestError) {
      // Keep the public website usable if Supabase is temporarily unavailable.
      setContent(initialContent);
      setError("");
    }
  }

  // Fetch content once when the provider is first mounted.
  useEffect(() => {
    refresh();
  }, []);

  // Reuse the same context object until its content or error changes.
  const value = useMemo(() => ({ content, setContent, refresh, error }), [content, error]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

// Gives any child component access to the shared portfolio content.
export function useContent() {
  const value = useContext(ContentContext);
  if (!value) throw new Error("useContent must be used inside ContentProvider");
  return value;
}
