import { createContext, useContext, useEffect, useMemo, useState } from "react";
import initialContent from "../data/content.json";
import { supabase } from "./supabase";

const ContentContext = createContext(null);

function withItemVisibility(items = []) {
  return items.map((item) => ({ ...item, visible: item.visible !== false }));
}

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
    experience: withItemVisibility(savedContent.experience || initialContent.experience),
    extraCurricularActivities: withItemVisibility(savedContent.extraCurricularActivities || initialContent.extraCurricularActivities),
  };
}

export function ContentProvider({ children }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      if (!supabase) {
        setContent(initialContent);
        setError("Supabase is not configured yet.");
        return;
      }
      const { data, error: requestError } = await supabase
        .from("portfolio_content")
        .select("content")
        .eq("id", 1)
        .maybeSingle();
      if (requestError) throw requestError;
      setContent(mergeWithDefaults(data?.content));
      setError("");
    } catch (requestError) {
      setContent(initialContent);
      setError("");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(() => ({ content, setContent, refresh, error }), [content, error]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const value = useContext(ContentContext);
  if (!value) throw new Error("useContent must be used inside ContentProvider");
  return value;
}
