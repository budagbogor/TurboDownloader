import React from "react";
import { HardDriveDownload, Activity, Zap, ShieldCheck } from "lucide-react";
import { formatBytes } from "../lib/utils";

interface HeaderProps {
  totalSpeed: number;
  activeCount: number;
  completedCount: number;
}

export const Header: React.FC<HeaderProps> = ({ totalSpeed, activeCount, completedCount }) => {
  const isActivelyDownloading = totalSpeed > 0 || activeCount > 0;

  return (
    <header className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 shadow-sm">
              <HardDriveDownload className="w-6 h-6 text-emerald-600" />
            </div>
            {isActivelyDownloading && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">TurboDownloader</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                v2.0 PRO
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              Multi-Threaded Dynamic Byte-Range Accelerator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2 flex items-center gap-3 shadow-xs">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                Total Bandwidth
              </div>
              <div className="text-sm sm:text-base font-mono font-semibold text-slate-900">
                {formatBytes(totalSpeed)}/s
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2 shadow-xs">
            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                Queue Status
              </div>
              <div className="text-sm font-mono text-slate-700">
                <span className="text-emerald-700 font-semibold">{activeCount}</span> active /{" "}
                <span className="text-blue-700 font-semibold">{completedCount}</span> done
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-slate-400 ml-1" />
          </div>
        </div>
      </div>
    </header>
  );
};
