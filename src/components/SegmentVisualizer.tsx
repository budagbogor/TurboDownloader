import React from "react";
import { SegmentInfo } from "../types";
import { formatBytes } from "../lib/utils";
import { Cpu, CheckCircle2, AlertCircle, PauseCircle, Loader2 } from "lucide-react";

interface SegmentVisualizerProps {
  segments?: SegmentInfo[];
  numConnections: number;
}

export const SegmentVisualizer: React.FC<SegmentVisualizerProps> = ({ segments = [], numConnections }) => {
  if (!segments || segments.length === 0) {
    return (
      <div className="py-2 px-3 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
        <Cpu className="w-3.5 h-3.5 text-slate-400" />
        <span>Single-stream download ({numConnections} connection requested)</span>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Cpu className="w-3.5 h-3.5 text-emerald-600" />
          <span>Parallel Connection Threads ({segments.length} Streams Active)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Streaming
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
            Finished
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            Paused
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
        {segments.map((seg) => {
          const isComplete = seg.status === "completed" || seg.progress >= 100;
          const isDownloading = seg.status === "downloading";
          const isPaused = seg.status === "paused";
          const isError = seg.status === "error";

          return (
            <div
              key={seg.id}
              className="bg-slate-50 border border-slate-200/90 rounded-lg p-2 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-600 font-semibold">T#{seg.index}</span>
                <span className="text-slate-600">
                  {isComplete ? (
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  ) : isDownloading ? (
                    <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />
                  ) : isPaused ? (
                    <PauseCircle className="w-3 h-3 text-amber-600" />
                  ) : isError ? (
                    <AlertCircle className="w-3 h-3 text-red-600" />
                  ) : (
                    <span className="text-slate-400">Wait</span>
                  )}
                </span>
              </div>

              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden my-1">
                <div
                  className={`h-full transition-all duration-300 ${
                    isComplete
                      ? "bg-blue-600"
                      : isDownloading
                      ? "bg-emerald-500"
                      : isPaused
                      ? "bg-amber-500"
                      : isError
                      ? "bg-red-500"
                      : "bg-slate-300"
                  }`}
                  style={{ width: `${seg.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span>{seg.progress}%</span>
                <span>{formatBytes(seg.downloaded, 0)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
