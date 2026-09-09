import React, { useState, useEffect } from "react";
import { X, Download, Sliders, Loader2, Link2, FileCode } from "lucide-react";

interface NewDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDownload: (url: string, filename: string, connections: number) => Promise<void>;
  defaultConnections?: number;
  initialUrl?: string;
}

export const NewDownloadModal: React.FC<NewDownloadModalProps> = ({
  isOpen,
  onClose,
  onAddDownload,
  defaultConnections = 8,
  initialUrl = "",
}) => {
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [connections, setConnections] = useState(defaultConnections);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setConnections(defaultConnections);
      if (initialUrl) {
        setUrl(initialUrl);
      } else {
        setUrl("");
      }
      setFilename("");
      setError(null);
      setTimeout(() => {
        urlInputRef.current?.focus();
        urlInputRef.current?.select();
      }, 40);
    }
  }, [isOpen, defaultConnections, initialUrl]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onAddDownload(url.trim(), filename.trim(), connections);
      setUrl("");
      setFilename("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to start download");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Add Direct Download</h2>
              <p className="text-xs text-slate-500">High-speed multi-threaded byte-range fetching</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-slate-400" />
              Download Address (URL)
            </label>
            <input
              ref={urlInputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/software.zip"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              Custom File Name (Optional)
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Auto-detected from server if empty"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                Connection Threads
              </span>
              <span className="font-mono text-emerald-700 font-bold">{connections} Streams</span>
            </div>
            <input
              type="range"
              min="1"
              max="32"
              step="1"
              value={connections}
              onChange={(e) => setConnections(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1 (Single)</span>
              <span>8 (Turbo)</span>
              <span>16 (Max Speed)</span>
              <span>32 (Aggressive)</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !url}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95 shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Start Download</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
