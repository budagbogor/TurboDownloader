import React from "react";
import { DownloadTask } from "../types";
import { formatBytes, formatTime } from "../lib/utils";
import { SegmentVisualizer } from "./SegmentVisualizer";
import {
  X,
  Info,
  Link,
  Folder,
  Clock,
  Activity,
  Layers,
  Download,
  Play,
} from "lucide-react";

interface TaskDetailsModalProps {
  task: DownloadTask | null;
  onClose: () => void;
  onPlay?: (task: DownloadTask) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, onClose, onPlay }) => {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 rounded-xl border border-blue-200 text-blue-600">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 truncate max-w-md" title={task.filename}>
                {task.filename}
              </h2>
              <p className="text-xs text-slate-500 font-mono">Task ID: {task.id.slice(0, 13)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm text-slate-700">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-slate-400" />
              Source Address
            </div>
            <div className="font-mono text-xs text-slate-700 break-all select-all">
              {task.url}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] text-slate-500 font-medium uppercase">Total Size</div>
              <div className="text-sm font-mono font-semibold text-slate-900 mt-0.5">
                {formatBytes(task.totalSize)}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] text-slate-500 font-medium uppercase">Downloaded</div>
              <div className="text-sm font-mono font-semibold text-emerald-700 mt-0.5">
                {formatBytes(task.downloadedSize)}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] text-slate-500 font-medium uppercase">Current Speed</div>
              <div className="text-sm font-mono font-semibold text-amber-700 mt-0.5">
                {task.status === "downloading" ? `${formatBytes(task.speed)}/s` : "-"}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] text-slate-500 font-medium uppercase">Time Remaining</div>
              <div className="text-sm font-mono font-semibold text-blue-700 mt-0.5">
                {task.eta ? formatTime(task.eta) : task.status === "completed" ? "Done" : "-"}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200/80 text-xs">
            <div className="flex items-center justify-between p-2.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" /> Category
              </span>
              <span className="font-semibold text-slate-800 uppercase">{task.category}</span>
            </div>
            <div className="flex items-center justify-between p-2.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-400" /> Acceleration Streams
              </span>
              <span className="font-mono text-emerald-700 font-semibold">{task.numConnections} Threads</span>
            </div>
            <div className="flex items-center justify-between p-2.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-slate-400" /> Local Directory
              </span>
              <span className="font-mono text-slate-600 truncate max-w-xs">downloads/{task.filename}</span>
            </div>
            <div className="flex items-center justify-between p-2.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Added On
              </span>
              <span className="font-mono text-slate-700">
                {new Date(task.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <SegmentVisualizer segments={task.segments} numConnections={task.numConnections} />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.status === "completed" && task.category === "video" && onPlay && (
              <button
                onClick={() => {
                  onClose();
                  onPlay(task);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play / Preview Video</span>
              </button>
            )}

            {task.status === "completed" && (
              <a
                href={`/api/downloads/${task.id}/file`}
                download={task.filename}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save to Device</span>
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-2xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
