import React from "react";
import { CategoryType, DownloadTask } from "../types";
import {
  Download,
  CheckCircle2,
  PauseCircle,
  Video,
  Music,
  Archive,
  FileText,
  Package,
  Layers,
  HardDrive,
  FolderOpen,
  Trash2,
} from "lucide-react";

interface CategorySidebarProps {
  currentCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  tasks: DownloadTask[];
  trashCount?: number;
  onOpenTrash?: () => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  currentCategory,
  onSelectCategory,
  tasks,
  trashCount = 0,
  onOpenTrash,
}) => {
  const counts = {
    all: tasks.length,
    downloading: tasks.filter((t) => t.status === "downloading" || t.status === "merging").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    paused: tasks.filter((t) => t.status === "paused" || t.status === "error").length,
    video: tasks.filter((t) => t.category === "video").length,
    audio: tasks.filter((t) => t.category === "audio").length,
    compressed: tasks.filter((t) => t.category === "compressed").length,
    document: tasks.filter((t) => t.category === "document").length,
    program: tasks.filter((t) => t.category === "program").length,
    other: tasks.filter((t) => t.category === "other").length,
  };

  const statusItems = [
    { id: "all" as CategoryType, label: "All Downloads", icon: Layers, count: counts.all },
    { id: "downloading" as CategoryType, label: "Active Downloads", icon: Download, count: counts.downloading, color: "text-emerald-600" },
    { id: "completed" as CategoryType, label: "Completed", icon: CheckCircle2, count: counts.completed, color: "text-blue-600" },
    { id: "paused" as CategoryType, label: "Paused & Errors", icon: PauseCircle, count: counts.paused, color: "text-amber-600" },
  ];

  const categoryItems = [
    { id: "video" as CategoryType, label: "Videos", icon: Video, count: counts.video },
    { id: "audio" as CategoryType, label: "Music & Audio", icon: Music, count: counts.audio },
    { id: "compressed" as CategoryType, label: "Archives (Zip/Rar)", icon: Archive, count: counts.compressed },
    { id: "document" as CategoryType, label: "Documents", icon: FileText, count: counts.document },
    { id: "program" as CategoryType, label: "Applications", icon: Package, count: counts.program },
  ];

  return (
    <aside className="w-full lg:w-64 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between shrink-0 shadow-sm">
      <div>
        <div className="mb-6">
          <h3 className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-3 mb-2 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            Queues & Status
          </h3>
          <nav className="space-y-1">
            {statusItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentCategory === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectCategory(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-900/25 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/50 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-emerald-700 dark:text-emerald-300" : item.color || "text-slate-400 dark:text-slate-500"}`} />
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                      isActive
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-semibold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-3 mb-2 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            File Categories
          </h3>
          <nav className="space-y-1">
            {categoryItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentCategory === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectCategory(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-900/25 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/50 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-emerald-700 dark:text-emerald-300" : "text-slate-400 dark:text-slate-500"}`} />
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                      isActive
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-semibold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

        <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
          {onOpenTrash && (
            <button
              onClick={onOpenTrash}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-rose-50 dark:hover:bg-rose-900/15 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/30 hover:border-rose-200 dark:hover:border-rose-800/40"
              aria-label="Open trash"
              title="Trash / Recycle Bin"
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>Trash</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
                {trashCount}
              </span>
            </button>
          )}
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Target Storage</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-mono font-medium">SSD/Disk</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono text-[10px] text-slate-600 dark:text-slate-300 break-all">
              ~/Downloads/TurboDownloader
            </div>
          </div>
        </div>
    </aside>
  );
};
