import React, { useEffect, useRef, useState, useCallback } from "react";
import { FileUp, Link as LinkIcon, X } from "lucide-react";

interface DropZonePasteProps {
  onUrlsDetected: (urls: string[], preferBatch: boolean) => void;
  onAddSingleUrl?: (url: string) => void;
}

interface OverlayState {
  active: boolean;
  depth: number;
  lastUrls?: string[];
  count?: number;
}

function extractUrlsFromText(text: string): string[] {
  if (!text) return [];
  const re = /https?:\/\/[^\s"'<>\\\x00-\x1F]+/gi;
  return Array.from(new Set(text.match(re) || []));
}

export const GlobalDropPaste: React.FC<DropZonePasteProps> = ({ onUrlsDetected, onAddSingleUrl }) => {
  const [overlay, setOverlay] = useState<OverlayState>({ active: false, depth: 0 });
  const urlsRef = useRef<string[]>([]);
  const autoCloseTimer = useRef<number | null>(null);

  const openOverlay = useCallback((count: number, urls: string[]) => {
    if (autoCloseTimer.current !== null) window.clearTimeout(autoCloseTimer.current);
    urlsRef.current = urls;
    setOverlay({ active: true, depth: 1, lastUrls: urls, count });
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlay((prev) => ({ ...prev, active: false, depth: 0 }));
    urlsRef.current = [];
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || (active as HTMLElement).isContentEditable)) return;
      const text = e.clipboardData.getData("text");
      const urls = extractUrlsFromText(text);
      if (urls.length === 0) return;
      e.preventDefault();
      if (urls.length === 1 && onAddSingleUrl) {
        onAddSingleUrl(urls[0]);
      } else {
        onUrlsDetected(urls, urls.length > 1);
        openOverlay(urls.length, urls);
        autoCloseTimer.current = window.setTimeout(closeOverlay, 2200);
      }
    };

    const handleDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      const hasFileOrUrl = Array.from(e.dataTransfer.types || []).some((t) => t === "Files" || t === "text/uri-list" || t === "text/plain");
      if (!hasFileOrUrl) return;
      setOverlay((prev) => ({ ...prev, active: true, depth: prev.depth + 1, count: undefined }));
    };
    const handleDragOver = (e: DragEvent) => {
      if (overlay.active) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; }
    };
    const handleDragLeave = (e: DragEvent) => {
      setOverlay((prev) => {
        const d = Math.max(0, prev.depth - 1);
        return { ...prev, depth: d, active: d > 0 };
      });
    };
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const urls: string[] = [];
      if (e.dataTransfer) {
        const files = Array.from(e.dataTransfer.files || []);
        for (const f of files) {
          if (f.name.toLowerCase().endsWith(".txt") || f.type === "text/plain") {
            try {
              const txt = await f.text();
              urls.push(...extractUrlsFromText(txt));
            } catch { /* ignore */ }
          }
        }
        if (urls.length === 0) {
          const uriList = e.dataTransfer.getData("text/uri-list");
          if (uriList) urls.push(...extractUrlsFromText(uriList));
          const plain = e.dataTransfer.getData("text/plain");
          if (plain) urls.push(...extractUrlsFromText(plain));
        }
      }
      const unique = Array.from(new Set(urls));
      setOverlay((prev) => ({ ...prev, depth: 0, count: unique.length, lastUrls: unique }));
      if (unique.length === 1 && onAddSingleUrl) {
        onAddSingleUrl(unique[0]);
        autoCloseTimer.current = window.setTimeout(closeOverlay, 2000);
      } else if (unique.length > 0) {
        onUrlsDetected(unique, true);
        autoCloseTimer.current = window.setTimeout(closeOverlay, 2200);
      } else {
        closeOverlay();
      }
    };

    window.addEventListener("paste", handlePaste);
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [onUrlsDetected, onAddSingleUrl, openOverlay, closeOverlay, overlay.active]);

  if (!overlay.active && !overlay.count) return null;

  const count = overlay.count ?? 0;

  return (
    <div className={`fixed inset-0 z-[70] pointer-events-none transition-opacity duration-150 ${overlay.active || count > 0 ? "opacity-100" : "opacity-0"}`}>
      <div className={`absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-sky-500/10 to-violet-600/10 backdrop-blur-[2px] border-[6px] border-dashed transition-colors ${count > 0 ? "border-emerald-400/70" : "border-indigo-400/50"}`}>
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="pointer-events-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 px-6 py-5 max-w-md w-full">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl border shrink-0 ${count > 0 ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400" : "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400"}`}>
                {count > 0 ? <LinkIcon className="w-6 h-6" /> : <FileUp className="w-6 h-6 animate-bounce" />}
              </div>
              <div className="min-w-0 flex-1">
                {count === 0 ? (
                  <>
                    <div className="text-base font-semibold text-slate-900 dark:text-white">Drop URLs or .txt file</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Tarik & lepaskan file .txt (1 URL/baris), URL text, atau paste Ctrl+V.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-base font-semibold text-slate-900 dark:text-white">
                      {count === 1 ? "URL Terdeteksi — membuka Add Download" : `${count} URLs Terdeteksi — membuka Batch Import`}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {overlay.lastUrls?.slice(0, 2).map((u, i) => (
                        <div key={i} className="truncate font-mono">{u}</div>
                      ))}
                      {overlay.lastUrls && overlay.lastUrls.length > 2 && (
                        <div>+{overlay.lastUrls.length - 2} URL lain…</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={closeOverlay}
                className="pointer-events-auto p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0"
                aria-label="Close overlay"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalDropPaste;
