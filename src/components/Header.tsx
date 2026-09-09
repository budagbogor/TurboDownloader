import React from "react";
import { HardDriveDownload, Activity, Zap, ShieldCheck, Wifi, WifiOff, RefreshCw, Sparkles } from "lucide-react";
import { formatBytes } from "../lib/utils";
import type { ConnectionStatus } from "../hooks/useDownloadsWebSocket";
import { BandwidthSparkline } from "./BandwidthSparkline";

interface HeaderProps {
  totalSpeed: number;
  activeCount: number;
  completedCount: number;
  connectionStatus?: ConnectionStatus;
  speedHistory?: number[];
}

const statusConfig: Record<ConnectionStatus, { label: string; icon: React.ReactNode; chipStyle: string; pulse?: boolean }> = {
  connecting:   { label: "Connecting",       icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, chipStyle: "chip-warning", pulse: false },
  connected:    { label: "Live Sync (WS)",   icon: <Wifi className="w-3.5 h-3.5" />,                  chipStyle: "chip-success", pulse: true },
  reconnecting: { label: "Reconnecting",     icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, chipStyle: "chip-warning", pulse: false },
  polling:      { label: "Polling Fallback", icon: <WifiOff className="w-3.5 h-3.5" />,                 chipStyle: "chip-brand",   pulse: false },
  offline:      { label: "Offline",          icon: <WifiOff className="w-3.5 h-3.5" />,                 chipStyle: "chip-danger",  pulse: false },
};

export const Header: React.FC<HeaderProps> = ({
  totalSpeed,
  activeCount,
  completedCount,
  connectionStatus = "connecting",
  speedHistory,
}) => {
  const isActivelyDownloading = totalSpeed > 0 || activeCount > 0;
  const sc = statusConfig[connectionStatus];

  return (
    <header className="surface-card p-5 sm:p-6 mb-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* ===== Brand block ===== */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 rounded-xl2 bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-700 text-white shadow-ring animate-pulse-ring">
              <HardDriveDownload className="w-6 h-6" strokeWidth={2.1} />
            </div>
            {isActivelyDownloading && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-success-600 border-2 border-white"></span>
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-xl sm:text-[1.65rem] font-extrabold tracking-tight">
                Turbo<span className="gradient-text-brand">Downloader</span>
              </h1>
              <span className="chip chip-brand">
                <Sparkles className="w-3 h-3" />
                v3.0 PRO
              </span>
              <span className={`chip ${sc.chipStyle} ${sc.pulse ? "animate-pulse-ring" : ""}`}>
                {sc.icon}
                {sc.label}
              </span>
            </div>
            <p className="text-muted text-[13px] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-warning-500" />
              Multi-Threaded Dynamic Byte-Range Accelerator · IDM-Class Throughput
            </p>
          </div>
        </div>

        {/* ===== Stats block ===== */}
        <div className="flex flex-wrap items-stretch gap-3 self-start lg:self-auto">
          <div className="surface-card !rounded-[12px] !shadow-none px-4 py-2.5 flex items-center gap-3 min-w-[220px] border-muted !border-subtle">
            <div className="p-2 rounded-lg bg-success-50 text-success-600">
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted uppercase tracking-[0.12em] font-bold">
                Total Bandwidth
              </div>
              <div className="font-mono font-semibold text-on-surface text-[15px]">
                {formatBytes(totalSpeed)}
                <span className="text-tertiary text-[11px] font-medium">/s</span>
              </div>
            </div>
            {speedHistory && speedHistory.length > 1 && (
              <div className="hidden lg:block pl-3 border-l border-muted ml-1">
                <BandwidthSparkline
                  data={speedHistory}
                  strokeColor="#059669"
                  fillStartColor="rgba(16,185,129,0.45)"
                  fillEndColor="rgba(16,185,129,0.02)"
                />
              </div>
            )}
          </div>

          <div className="surface-card !rounded-[12px] !shadow-none px-4 py-2.5 flex items-center gap-3 min-w-[210px] border-muted !border-subtle">
            <div>
              <div className="text-[10px] text-muted uppercase tracking-[0.12em] font-bold mb-0.5">
                Queue Status
              </div>
              <div className="font-mono text-sm text-secondary flex items-center gap-1">
                <span className="text-success-600 font-extrabold text-on-surface">{activeCount}</span>
                <span className="text-disabled">active</span>
                <span className="text-disabled mx-1">·</span>
                <span className="text-brand-700 font-extrabold text-on-surface">{completedCount}</span>
                <span className="text-disabled">done</span>
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-brand-500 ml-auto" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
