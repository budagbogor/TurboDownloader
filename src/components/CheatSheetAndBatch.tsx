import React, { useEffect, useState, useRef, useCallback } from "react";
import { X, Upload, FileText, Link2, Plus, Keyboard, Layers, AlertTriangle, CheckCircle } from "lucide-react";

export interface Shortcut {
  keys: string;
  label: string;
  description: string;
  group: "Navigation" | "Downloads" | "Actions" | "View";
}

export const SHORTCUTS: Shortcut[] = [
  { keys: "N", label: "New Download", description: "Buka modal tambah download baru", group: "Downloads" },
  { keys: "S", label: "Media Sniffer", description: "Buka modal sniff & extract media", group: "Downloads" },
  { keys: "B", label: "Batch Import", description: "Buka modal import batch TXT/URLs", group: "Downloads" },
  { keys: "T / 0", label: "Open Trash", description: "Buka keranjang sampah (Trash / Recycle Bin)", group: "Navigation" },
  { keys: ",", label: "Settings", description: "Buka halaman pengaturan aplikasi", group: "Navigation" },
  { keys: "/", label: "Focus Search", description: "Arahkan fokus ke kolom pencarian", group: "Navigation" },
  { keys: "1 9", label: "Category Filter", description: "Tekan 1=All, 2=Downloading, 3=Completed, 4=Paused, 5=Video, 6=Audio, 7=Compressed, 8=Document, 9=Other", group: "Navigation" },
  { keys: "Esc", label: "Close Modals", description: "Tutup modal yang sedang terbuka", group: "Actions" },
  { keys: "Ctrl+V", label: "Paste URL", description: "Global paste listener: jika URL di clipboard, langsung buka modal baru dengan URL terisi", group: "Downloads" },
  { keys: "Drag Files", label: "Drop Zone", description: "Drag file .txt (1 URL per line) atau langsung paste URL link ke window manapun", group: "Downloads" },
  { keys: "K", label: "Cheat Sheet", description: "Tampilkan jendela shortcut ini (Ctrl+/ juga bisa)", group: "View" },
  { keys: "?", label: "Help", description: "Alias menampilkan cheat sheet shortcut", group: "View" },
  { keys: "Space", label: "Resume/Pause Focused", description: "Play/pause task yang sedang diinspeksi", group: "Actions" },
];

interface CheatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBatch: () => void;
  onOpenAdd: () => void;
  onOpenSniffer: () => void;
  onOpenSettings: () => void;
  onSearch: () => void;
}

const KEYGROUP_ORDER: Shortcut["group"][] = ["Navigation", "Downloads", "Actions", "View"];

export const CheatSheet: React.FC<CheatSheetProps> = ({ isOpen, onClose, onOpenBatch, onOpenAdd, onOpenSniffer, onOpenSettings, onSearch }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[85vh] surface-card rounded-2xl flex flex-col overflow-hidden shadow-popover"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-muted shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 rounded-lg border border-brand-100">
              <Keyboard className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-on-surface">Keyboard Shortcuts</h2>
              <p className="text-xs text-muted mt-0.5">
                Tekan tombol untuk aksi cepat — Boost produktivitas hingga 3x
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-subtle text-secondary" aria-label="Close cheat sheet">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 flex-1 scroll-soft">
          {KEYGROUP_ORDER.map((group) => {
            const items = SHORTCUTS.filter((s) => s.group === group);
            if (items.length === 0) return null;
            return (
              <section key={group}>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted mb-2">{group}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {items.map((s) => (
                    <div key={s.keys} className="flex items-start justify-between gap-3 py-2 px-3 rounded-lg hover:bg-subtle transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-on-surface">{s.label}</div>
                        <div className="text-xs text-muted leading-relaxed">{s.description}</div>
                      </div>
                      <kbd className="shrink-0 inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 bg-muted border border-muted rounded-md text-secondary shadow-sm">
                        {s.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-muted bg-muted/50 shrink-0">
          <button onClick={onOpenAdd} className="chip chip-default flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add DL
          </button>
          <button onClick={onOpenSniffer} className="chip chip-default flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" /> Sniff
          </button>
          <button onClick={onOpenBatch} className="chip chip-default flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Batch
          </button>
          <button onClick={onSearch} className="chip chip-default flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" /> Focus /
          </button>
          <button onClick={onOpenSettings} className="chip chip-brand font-medium">
            Settings ,
          </button>
        </div>
      </div>
    </div>
  );
};

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (urls: string[]) => Promise<{ ok: number; failed: number; errors: string[] }>;
  defaultConnections: number;
}

function extractUrls(text: string): string[] {
  if (!text) return [];
  const httpRe = /https?:\/\/[^\s"'<>\\\x00-\x1F]+/gi;
  const urls = text.match(httpRe) || [];
  const byLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && /^https?:\/\//i.test(l));
  const merged = [...new Set([...byLine, ...urls])];
  return merged.slice(0, 500);
}

export const BatchModal: React.FC<BatchModalProps> = ({ isOpen, onClose, onImport, defaultConnections }) => {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"text" | "file">("text");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setValue("");
      setMode("text");
      setRunning(false);
      setResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen]);

  const urls = useCallback(() => extractUrls(value), [value]);

  const handleFile = async (f: File) => {
    try {
      const txt = await f.text();
      setValue(txt);
      setMode("file");
    } catch {
      setValue("");
    }
  };

  const start = async () => {
    const list = urls();
    if (list.length === 0) return;
    setRunning(true);
    setResult(null);
    try {
      const r = await onImport(list);
      setResult(r);
    } finally {
      setRunning(false);
    }
  };

  if (!isOpen) return null;

  const parsed = urls();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="w-full max-w-2xl max-h-[88vh] surface-card rounded-2xl flex flex-col overflow-hidden shadow-popover">
        <div className="flex items-center justify-between px-5 py-4 border-b border-muted shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-violet-50 rounded-lg border border-violet-100">
              <Layers className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-on-surface">Batch Import URLs</h2>
              <p className="text-xs text-muted mt-0.5">Paste URL 1 per baris atau upload file .txt — max 500 URL</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-subtle text-secondary" aria-label="Close batch">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4 scroll-soft">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setMode("text")}
              className={`chip border transition-colors ${
                mode === "text"
                  ? "bg-brand-50 border-brand-100 text-brand-700"
                  : "border-muted text-secondary hover:bg-subtle"
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Paste Text</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`chip border transition-colors ${
                mode === "file"
                  ? "bg-brand-50 border-brand-100 text-brand-700"
                  : "border-muted text-secondary hover:bg-subtle"
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Upload .txt</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <div className="ml-auto chip chip-default font-mono">
              {parsed.length} URLs detected · {defaultConnections} conn/each
            </div>
          </div>

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Sisipkan URL 1 per baris, misalnya:\nhttps://www.youtube.com/watch?v=abc123\nhttps://vimeo.com/123456\nhttps://example.com/video.mp4\n\nAtau upload file .txt — setiap baris = 1 URL.`}
            className="w-full h-64 px-3 py-2.5 text-xs font-mono rounded-xl2 border border-muted bg-muted text-on-surface placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none shadow-card"
            spellCheck={false}
          />

          {parsed.length > 0 && (
            <div className="rounded-xl2 bg-muted border border-muted p-3">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted mb-1.5">Preview (first 6)</div>
              <ol className="space-y-1">
                {parsed.slice(0, 6).map((u, i) => (
                  <li key={i} className="text-xs font-mono text-secondary truncate">
                    <span className="inline-block w-6 text-muted">{i + 1}.</span>
                    {u}
                  </li>
                ))}
                {parsed.length > 6 && (
                  <li className="text-xs text-muted">
                    + {parsed.length - 6} URL lain akan di-import…
                  </li>
                )}
              </ol>
            </div>
          )}

          {result && (
            <div className={`rounded-xl2 border p-3 ${result.failed === 0 ? "bg-success-50 border-success-100" : "bg-warning-50 border-warning-100"}`}>
              <div className="flex items-center gap-2 mb-1">
                {result.failed === 0 ? (
                  <CheckCircle className="w-4 h-4 text-success-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-warning-600" />
                )}
                <div className="text-sm font-semibold text-on-surface">
                  {result.ok} berhasil · {result.failed} gagal · total {result.ok + result.failed}
                </div>
              </div>
              {result.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i} className="text-xs font-mono text-secondary truncate">• {e}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li className="text-xs text-muted">
                      + {result.errors.length - 5} error lain
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-muted bg-muted/50 shrink-0">
          <button
            onClick={onClose}
            className="chip chip-default"
          >
            {result ? "Close" : "Cancel"}
          </button>
          <button
            onClick={start}
            disabled={parsed.length === 0 || running}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {running ? `Importing ${parsed.length}…` : `Import ${parsed.length} URLs`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheatSheet;
