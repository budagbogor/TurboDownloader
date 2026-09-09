import { useEffect, useCallback, useRef } from "react";
import type { CategoryType } from "../types";

export interface ShortcutHandlers {
  onNewDownload: () => void;
  onSniffer: () => void;
  onBatch: () => void;
  onSettings: () => void;
  onCheatSheet: () => void;
  onSearchFocus: () => void;
  onCategory: (c: CategoryType) => void;
  onOpenTrash?: () => void;
  onResumeAll?: () => void;
  onPauseAll?: () => void;
}

const CATEGORY_BY_KEY: Record<string, CategoryType> = {
  "1": "all",
  "2": "downloading",
  "3": "completed",
  "4": "paused",
  "5": "video",
  "6": "audio",
  "7": "compressed",
  "8": "document",
  "9": "other",
};

function editableTarget(t: EventTarget | null): boolean {
  if (!t) return false;
  const el = t as HTMLElement;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if ((el as HTMLInputElement).disabled) return true;
  return false;
}

export function useShortcuts(handlers: ShortcutHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  const onKey = useCallback((e: KeyboardEvent) => {
    const h = ref.current;
    if (editableTarget(e.target)) {
      if (e.key === "Escape") {
        const el = e.target as HTMLElement;
        if (el.blur) el.blur();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        h.onCheatSheet();
      }
      return;
    }

    const key = e.key;
    const lower = key.length === 1 ? key.toLowerCase() : key;

    if (e.key === "Escape") { h.onCheatSheet(); return; }

    if ((e.ctrlKey || e.metaKey) && (key === "k" || key === "?" || key === "/")) { e.preventDefault(); h.onCheatSheet(); return; }

    if (lower === "n") { e.preventDefault(); h.onNewDownload(); return; }
    if (lower === "s") { e.preventDefault(); h.onSniffer(); return; }
    if (lower === "b") { e.preventDefault(); h.onBatch(); return; }
    if (lower === "," || lower === "<") { e.preventDefault(); h.onSettings(); return; }
    if (lower === "k" || lower === "?") { e.preventDefault(); h.onCheatSheet(); return; }
    if (lower === "/") { e.preventDefault(); h.onSearchFocus(); return; }
    if ((lower === "t" || key === "0") && h.onOpenTrash) { e.preventDefault(); h.onOpenTrash(); return; }

    const cat = CATEGORY_BY_KEY[key];
    if (cat) { e.preventDefault(); h.onCategory(cat); return; }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onKey]);
}

export default useShortcuts;
