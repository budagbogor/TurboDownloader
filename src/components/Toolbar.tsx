import React from "react";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Search,
  ArrowUpDown,
  Sparkles,
  Compass,
} from "lucide-react";

interface ToolbarProps {
  onOpenAddModal: () => void;
  onOpenAnalyzerModal: () => void;
  onOpenWizard: () => void;
  onResumeAll: () => void;
  onPauseAll: () => void;
  onClearCompleted: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: "date" | "name" | "size" | "speed";
  onSortChange: (sort: "date" | "name" | "size" | "speed") => void;
  hasActiveDownloads: boolean;
  hasCompletedDownloads: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onOpenAddModal,
  onOpenAnalyzerModal,
  onOpenWizard,
  onResumeAll,
  onPauseAll,
  onClearCompleted,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  hasActiveDownloads,
  hasCompletedDownloads,
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenAddModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Download</span>
          </button>

          <button
            onClick={onOpenAnalyzerModal}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all active:scale-95 group cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
            <span>Sniff & Extract Media</span>
          </button>

          <button
            onClick={onOpenWizard}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 font-medium px-3.5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Buka Menu Panduan / Wizard Pengguna Baru"
          >
            <Compass className="w-4 h-4 text-emerald-700" />
            <span>Panduan Wizard</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />

          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={onResumeAll}
              className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
              title="Resume All Downloads"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Resume All</span>
            </button>

            <button
              onClick={onPauseAll}
              disabled={!hasActiveDownloads}
              className="p-2 text-slate-600 hover:text-amber-700 hover:bg-white rounded-lg transition-colors text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Pause All Downloads"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Pause All</span>
            </button>

            <button
              onClick={onClearCompleted}
              disabled={!hasCompletedDownloads}
              className="p-2 text-slate-600 hover:text-red-700 hover:bg-white rounded-lg transition-colors text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Clear Completed Tasks"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clean</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search filename or link..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              aria-label="Sort downloads by"
              className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              <option value="date">Date Added</option>
              <option value="name">Filename</option>
              <option value="size">File Size</option>
              <option value="speed">Speed</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
