import React, { useState } from "react";
import { AnalyzeFormat } from "../types";
import { formatBytes } from "../lib/utils";
import {
  X,
  Sparkles,
  Loader2,
  Video,
  Music,
  Check,
  Zap,
  Sliders,
  AlertCircle
} from "lucide-react";

interface MediaAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDownload: (url: string, filename: string, connections: number) => Promise<void>;
}

export const MediaAnalyzerModal: React.FC<MediaAnalyzerModalProps> = ({
  isOpen,
  onClose,
  onStartDownload,
}) => {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formats, setFormats] = useState<AnalyzeFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<AnalyzeFormat | null>(null);
  const [connections, setConnections] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setFormats([]);
    setSelectedFormat(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: Failed to analyze link`);
      }

      const data = await res.json();
      if (data.formats && data.formats.length > 0) {
        setFormats(data.formats);
        setSelectedFormat(data.formats[0]);
      } else {
        throw new Error("No downloadable streams or formats detected from this URL.");
      }
    } catch (err: any) {
      console.error("Media analysis error:", err);
      setError(err.message || "Failed to analyze URL.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStart = async () => {
    if (!selectedFormat) return;
    setIsSubmitting(true);
    try {
      const filename = selectedFormat.title
        ? `${selectedFormat.title.replace(/[^\w\s.-]/gi, "_")}.${selectedFormat.format.includes("audio") ? "mp3" : "mp4"}`
        : "";

      await onStartDownload(selectedFormat.url, filename, connections);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to queue download.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Media Sniffer & Stream Extractor</h2>
              <p className="text-xs text-slate-500">Probe TikTok, YouTube, Reels, or direct video streams</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <form onSubmit={handleAnalyze} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Media / Stream URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.tiktok.com/... or https://youtube.com/..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                required
              />
              <button
                type="submit"
                disabled={isAnalyzing || !url}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shrink-0 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sniffing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {formats.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Available Streams & Resolutions
                </span>
                <span className="text-xs text-slate-500">{formats.length} formats detected</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {formats.map((fmt) => {
                  const isSelected = selectedFormat?.id === fmt.id;
                  const isAudio = fmt.format.includes("audio");

                  return (
                    <div
                      key={fmt.id}
                      onClick={() => setSelectedFormat(fmt)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-50/80 border-emerald-400 text-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isAudio ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {isAudio ? <Music className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{fmt.quality}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {fmt.format} {fmt.size > 0 && `• ${formatBytes(fmt.size)}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                    Acceleration Threads
                  </span>
                  <span className="font-mono text-emerald-700 font-semibold">{connections} Streams</span>
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
                  <span>1 (Normal)</span>
                  <span>8 (Turbo)</span>
                  <span>16 (Extreme)</span>
                  <span>32 (Max)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {formats.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={isSubmitting || !selectedFormat}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95 shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Download Now</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
