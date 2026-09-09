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
    { id: "all" as CategoryType,         label: "All Downloads",     icon: Layers,        count: counts.all,         activeTint: "brand" },
    { id: "downloading" as CategoryType, label: "Active Downloads",  icon: Download,      count: counts.downloading, activeTint: "success", iconColor: "text-success-600" },
    { id: "completed" as CategoryType,   label: "Completed",         icon: CheckCircle2,  count: counts.completed,   activeTint: "success", iconColor: "text-brand-700" },
    { id: "paused" as CategoryType,      label: "Paused & Errors",   icon: PauseCircle,   count: counts.paused,      activeTint: "warning", iconColor: "text-warning-600" },
  ];

  const categoryItems = [
    { id: "video" as CategoryType,      label: "Videos",            icon: Video,     count: counts.video },
    { id: "audio" as CategoryType,      label: "Music & Audio",     icon: Music,     count: counts.audio },
    { id: "compressed" as CategoryType, label: "Archives (Zip/Rar)", icon: Archive,  count: counts.compressed },
    { id: "document" as CategoryType,   label: "Documents",         icon: FileText,  count: counts.document },
    { id: "program" as CategoryType,    label: "Applications",      icon: Package,   count: counts.program },
  ];

  return (
    <aside className="w-full lg:w-72 surface-card p-4 sm:p-5 flex flex-col justify-between shrink-0 animate-fade-in">
      <div>
        <div className="mb-6">
          <h3 className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase px-3 mb-3 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            Queues & Status
          </h3>
          <nav className="space-y-1.5">
            {statusItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentCategory === item.id;
              const tint = item.activeTint;
              const activeBg = tint === "brand" ? "bg-brand-50 border-brand-100"
                            : tint === "success" ? "bg-success-50 border-success-100"
                            : "bg-warning-50 border-warning-100";
              const activeText = tint === "brand" ? "text-brand-700"
                               : tint === "success" ? "text-success-700"
                               : "text-warning-700";
              const activeChipBg = tint === "brand" ? "bg-brand-100 text-brand-700"
                                 : tint === "success" ? "bg-success-100 text-success-700"
                                 : "bg-warning-100 text-warning-700";
              const activeIcon = tint === "brand" ? "text-brand-700"
                               : tint === "success" ? "text-success-700"
                               : "text-warning-600";

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectCategory(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    isActive
                      ? `${activeBg} ${activeText} shadow-sm`
                      : "bg-transparent border-transparent text-secondary hover:bg-muted hover:text-on-surface"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? activeIcon : item.iconColor || "text-muted"}`} />
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-lg font-mono font-bold ${
                      isActive ? activeChipBg : "bg-muted text-secondary"
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
          <h3 className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase px-3 mb-3 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" />
            File Categories
          </h3>
          <nav className="space-y-1.5">
            {categoryItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentCategory === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectCategory(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    isActive
                      ? "bg-brand-50 border-brand-100 text-brand-700 shadow-sm"
                      : "bg-transparent border-transparent text-secondary hover:bg-muted hover:text-on-surface"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? "text-brand-700" : "text-muted"}`} />
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-lg font-mono font-bold ${
                      isActive ? "bg-brand-100 text-brand-700" : "bg-muted text-secondary"
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

      <div className="mt-6 pt-4 border-t border-subtle space-y-3">
        {onOpenTrash && (
          <button
            onClick={onOpenTrash}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border border-danger-100 bg-danger-50/70 text-danger-700 hover:bg-danger-50 hover:border-danger-200"
            aria-label="Open trash"
            title="Trash / Recycle Bin"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4.5 h-4.5 text-danger-500" />
              <span>Trash</span>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-lg font-mono font-bold bg-danger-100 text-danger-700">
              {trashCount}
            </span>
          </button>
        )}
        <div className="text-[11px]">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-muted font-bold">Target Storage</span>
            <span className="text-success-700 font-mono font-bold">SSD/Disk</span>
          </div>
          <div className="bg-muted border border-subtle rounded-xl p-2.5 font-mono text-[10.5px] text-secondary break-all leading-relaxed">
            ~/Downloads/TurboDownloader
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CategorySidebar;
