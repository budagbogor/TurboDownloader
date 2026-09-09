import React from "react";
import { HardDriveDownload, Activity, Zap, ShieldCheck, Wifi, WifiOff, RefreshCw, Sun, Moon, Monitor } from "lucide-react";
import { formatBytes } from "../lib/utils";
import type { ConnectionStatus } from "../hooks/useDownloadsWebSocket";
import type { AppSettings } from "../types";
import { BandwidthSparkline } from "./BandwidthSparkline";

interface HeaderProps {
  totalSpeed: number;
  activeCount: number;
  completedCount: number;
  connectionStatus?: ConnectionStatus;
  isDark?: boolean;
  theme?: AppSettings["theme"];
  onToggleTheme?: () => void;
  speedHistory?: number[];
}

const statusConfig: Record<ConnectionStatus, { label: string; color: string; colorDark: string; bg: string; bgDark: string; icon: React.ReactNode; pulse?: boolean }> = {
  connecting: { label: "Connecting", color: "text-amber-700", colorDark: "text-amber-300", bg: "bg-amber-50 border-amber-200", bgDark: "bg-amber-950/40 border-amber-800/60", icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, pulse: false },
  connected: { label: "Live (WS)", color: "text-emerald-700", colorDark: "text-emerald-300", bg: "bg-emerald-50 border-emerald-200", bgDark: "bg-emerald-950/40 border-emerald-800/60", icon: <Wifi className="w-3.5 h-3.5" />, pulse: true },
  reconnecting: { label: "Reconnecting", color: "text-amber-700", colorDark: "text-amber-300", bg: "bg-amber-50 border-amber-200", bgDark: "bg-amber-950/40 border-amber-800/60", icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, pulse: false },
  polling: { label: "Polling (fallback)", color: "text-sky-700", colorDark: "text-sky-300", bg: "bg-sky-50 border-sky-200", bgDark: "bg-sky-950/40 border-sky-800/60", icon: <WifiOff className="w-3.5 h-3.5" />, pulse: false },
  offline: { label: "Offline", color: "text-rose-700", colorDark: "text-rose-300", bg: "bg-rose-50 border-rose-200", bgDark: "bg-rose-950/40 border-rose-800/60", icon: <WifiOff className="w-3.5 h-3.5" />, pulse: false },
};

const themeLabel = (mode: AppSettings["theme"] | undefined): string => {
  if (mode === "dark") return "Dark";
  if (mode === "light") return "Light";
  return "System";
};

const themeIcon = (mode: AppSettings["theme"] | undefined, isDark: boolean) => {
  if (mode === "system") return <Monitor className="w-4 h-4" />;
  return isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />;
};

export const Header: React.FC<HeaderProps> = ({ totalSpeed, activeCount, completedCount, connectionStatus = "connecting", isDark = false, theme = "system", onToggleTheme, speedHistory }) => {
  const isActivelyDownloading = totalSpeed > 0 || activeCount > 0;
  const sc = statusConfig[connectionStatus];

  return (
    <header className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm">
              <HardDriveDownload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            {isActivelyDownloading && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">TurboDownloader</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                v3.0 PRO
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${sc.bg} dark:${sc.bgDark} ${sc.color} dark:${sc.colorDark}`} title={`Connection: ${sc.label}`}>
                {sc.icon}
                {sc.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              Multi-Threaded Dynamic Byte-Range Accelerator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          <button
            type="button"
            onClick={onToggleTheme}
            title={`Theme: ${themeLabel(theme)} — click to cycle (system → light → dark)`}
            aria-label={`Current theme ${themeLabel(theme)}. Click to toggle.`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shadow-xs"
          >
            {themeIcon(theme, isDark)}
            <span className="hidden sm:inline font-mono">{themeLabel(theme)}</span>
          </button>

          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/90 dark:border-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-3 shadow-xs">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                Total Bandwidth
              </div>
              <div className="text-sm sm:text-base font-mono font-semibold text-slate-900 dark:text-slate-100">
                {formatBytes(totalSpeed)}/s
              </div>
            </div>
            {speedHistory && speedHistory.length > 0 && (
              <div className="hidden lg:block pl-2 border-l border-slate-200/80 dark:border-slate-700/80 ml-1">
                <BandwidthSparkline
                  data={speedHistory}
                  strokeColor={isDark ? "#34d399" : "#059669"}
                  fillStartColor={isDark ? "rgba(52,211,153,0.35)" : "rgba(16,185,129,0.45)"}
                  fillEndColor={isDark ? "rgba(52,211,153,0.02)" : "rgba(16,185,129,0.02)"}
                />
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/90 dark:border-slate-800 rounded-xl px-3.5 py-2 shadow-xs">
            <div className="text-right">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                Queue Status
              </div>
              <div className="text-sm font-mono text-slate-700 dark:text-slate-300">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{activeCount}</span> active /{" "}
                <span className="text-blue-700 dark:text-blue-400 font-semibold">{completedCount}</span> done
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-slate-400 ml-1" />
          </div>
        </div>
      </div>
    </header>
  );
};
