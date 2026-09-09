import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { DownloadTask, CategoryType, SystemStats, AppSettings, TrashItem } from "./types";
import { Header } from "./components/Header";
import { CategorySidebar } from "./components/CategorySidebar";
import { Toolbar } from "./components/Toolbar";
import { DownloadItem } from "./components/DownloadItem";
import { NewDownloadModal } from "./components/NewDownloadModal";
import { MediaAnalyzerModal } from "./components/MediaAnalyzerModal";
import { TaskDetailsModal } from "./components/TaskDetailsModal";
import { OnboardingWizardModal } from "./components/OnboardingWizardModal";
import { VideoPlayerModal } from "./components/VideoPlayerModal";
import { SettingsPage } from "./components/SettingsPage";
import { CheatSheet, BatchModal } from "./components/CheatSheetAndBatch";
import { GlobalDropPaste } from "./components/GlobalDropPaste";
import { TrashPage } from "./components/TrashPage";
import { useDownloadsWebSocket } from "./hooks/useDownloadsWebSocket";
import { useTheme } from "./hooks/useTheme";
import { useShortcuts } from "./hooks/useShortcuts";
import { Download, Inbox, Layers } from "lucide-react";

export default function App() {
  const [currentCategory, setCurrentCategory] = useState<CategoryType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size" | "speed">("date");
  const [speedHistory, setSpeedHistory] = useState<number[]>(() => Array.from({ length: 60 }, () => 0));

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAnalyzerModalOpen, setIsAnalyzerModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [trashCount, setTrashCount] = useState<number>(0);
  const [initialAddUrl, setInitialAddUrl] = useState<string>("");
  const [inspectingTask, setInspectingTask] = useState<DownloadTask | null>(null);
  const [playingTask, setPlayingTask] = useState<DownloadTask | null>(null);

  const [defaultConnections, setDefaultConnections] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("turbodownloader_default_connections");
      return saved ? parseInt(saved, 10) : 8;
    } catch {
      return 8;
    }
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSetDefaultConnections = (conns: number) => {
    setDefaultConnections(conns);
    try {
      localStorage.setItem("turbodownloader_default_connections", conns.toString());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    try {
      const wizardSeen = localStorage.getItem("turbodownloader_wizard_completed");
      if (!wizardSeen) setIsWizardOpen(true);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const triggerNotification = useCallback((task: DownloadTask) => {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Download Finished", {
          body: `"${task.filename}" completed successfully!`,
        });
      } catch {
        /* notification permission may be revoked silently */
      }
    }
  }, []);

  const handleInspectUpdate = useCallback((updated: DownloadTask) => {
    setInspectingTask((prev) => (prev && prev.id === updated.id ? updated : prev));
  }, []);

  const {
    downloads,
    settings,
    status: connectionStatus,
    setInspectingId,
    setOnTaskNotified,
    setOnInspectUpdate,
  } = useDownloadsWebSocket([]);

  const theme = useTheme(settings || {});
  const isDark = theme.isDark;

  useEffect(() => { setOnTaskNotified(triggerNotification); }, [setOnTaskNotified, triggerNotification]);
  useEffect(() => { setOnInspectUpdate(handleInspectUpdate); }, [setOnInspectUpdate, handleInspectUpdate]);
  useEffect(() => { setInspectingId(inspectingTask ? inspectingTask.id : null); }, [setInspectingId, inspectingTask]);

  const stats: SystemStats = useMemo(() => {
    let totalSpeed = 0;
    let activeCount = 0;
    let completedCount = 0;
    let pausedCount = 0;

    downloads.forEach((d) => {
      if (d.status === "downloading" || d.status === "merging") {
        activeCount++;
        totalSpeed += d.speed || 0;
      } else if (d.status === "completed") {
        completedCount++;
      } else if (d.status === "paused" || d.status === "error") {
        pausedCount++;
      }
    });

    return { totalTasks: downloads.length, activeCount, completedCount, pausedCount, totalSpeed };
  }, [downloads]);

  useEffect(() => {
    const t = window.setInterval(() => {
      setSpeedHistory((prev) => {
        const next = prev.slice(-59);
        let total = 0;
        for (const d of downloads) if (d.status === "downloading" || d.status === "merging") total += d.speed || 0;
        next.push(total);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [downloads]);

  const handleAddDownload = async (url: string, filename: string, connections: number) => {
    const res = await fetch("/api/downloads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, filename, connections }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to start download");
    }
  };

  const handleTriggerDemoDownload = async () => {
    await handleAddDownload(
      "/api/sample-demo.dat",
      "TurboSpeed_Sample_12MB.zip",
      defaultConnections || 8
    );
  };

  const handlePause = async (id: string) => {
    try {
      await fetch(`/api/downloads/${id}/pause`, { method: "POST" });
    } catch (e) {
      console.error("Pause error:", e);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await fetch(`/api/downloads/${id}/resume`, { method: "POST" });
    } catch (e) {
      console.error("Resume error:", e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/downloads/${id}`, { method: "DELETE" });
      if (inspectingTask?.id === id) setInspectingTask(null);
      await fetchTrashCount();
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const handlePauseAll = async () => {
    try { await fetch("/api/downloads/pause-all", { method: "POST" }); }
    catch (e) { console.error("Pause all error:", e); }
  };

  const handleResumeAll = async () => {
    try { await fetch("/api/downloads/resume-all", { method: "POST" }); }
    catch (e) { console.error("Resume all error:", e); }
  };

  const handleClearCompleted = async () => {
    try { await fetch("/api/downloads/clear-completed", { method: "POST" }); }
    catch (e) { console.error("Clear completed error:", e); }
  };

  const defaultAppSettings: AppSettings = useMemo(() => ({
    maxConcurrentDownloads: 3,
    maxBandwidthKbps: 0,
    defaultConnections: 8,
    defaultDownloadDir: "./downloads",
    defaultVideoQuality: "best",
    youtubeCookiePath: "",
    instagramCookieHeader: "",
    theme: "system",
    notificationsEnabled: 1,
    autoMergeSegments: 1,
    autoOptimizeMp4: 1,
    trashRetentionDays: 30,
    enableBrowserNotifications: 1,
  }), []);

  const currentSettings: AppSettings = useMemo(() => ({ ...defaultAppSettings, ...(settings || {}) }), [settings, defaultAppSettings]);

  const toggleTheme = useCallback(async () => {
    const order: AppSettings["theme"][] = ["system", "light", "dark"];
    const cur = currentSettings.theme || "system";
    const idx = order.indexOf(cur);
    const next = order[(idx + 1) % order.length];
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "theme", value: next }),
      });
    } catch { /* noop */ }
  }, [currentSettings.theme]);

  const handleSaveSettings = async (updated: AppSettings): Promise<boolean> => {
    for (const [k, v] of Object.entries(updated)) {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: k, value: v }),
      });
      if (!res.ok) return false;
    }
    setDefaultConnections(updated.defaultConnections);
    return true;
  };

  const handleBatchImport = async (urls: string[]): Promise<{ ok: number; failed: number; errors: string[] }> => {
    let ok = 0;
    const errors: string[] = [];
    for (const u of urls) {
      try {
        await handleAddDownload(u, "", defaultConnections || 8);
        ok++;
      } catch (e: any) {
        errors.push(`${u.substring(0, 50)} — ${e?.message || "Unknown error"}`);
      }
    }
    return { ok, failed: urls.length - ok, errors };
  };

  const fetchTrashCount = useCallback(async () => {
    try {
      const res = await fetch("/api/trash", { cache: "no-store" });
      if (res.ok) {
        const list = (await res.json()) as any[];
        setTrashCount(list.length);
      }
    } catch { /* noop */ }
  }, []);

  const refreshTrash = useCallback(async (): Promise<TrashItem[]> => {
    const res = await fetch("/api/trash", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch trash");
    const rows: any[] = await res.json();
    setTrashCount(rows.length);
    return rows.map((r: any) => ({
      id: r.id,
      url: r.url,
      filename: r.filename,
      totalSize: r.total_size ?? r.totalSize ?? 0,
      downloadedSize: r.downloaded_size ?? r.downloadedSize ?? 0,
      status: r.status as any,
      speed: r.speed ?? 0,
      error: r.error ?? undefined,
      progress: r.progress ?? 0,
      eta: r.eta ?? null,
      category: r.category ?? "other",
      numConnections: r.num_connections ?? r.numConnections ?? 8,
      createdAt: r.created_at ?? r.createdAt ?? 0,
      deletedAt: r.deleted_at ?? r.deletedAt ?? Date.now(),
    }));
  }, []);

  const restoreTrash = useCallback(async (id: string) => {
    const res = await fetch(`/api/trash/${id}/restore`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Gagal restore task" }));
      throw new Error(err?.error || "Gagal restore task");
    }
    setTrashCount((c) => Math.max(0, c - 1));
  }, []);

  const foreverDeleteTrash = useCallback(async (id: string) => {
    const res = await fetch(`/api/trash/${id}/forever`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Gagal hapus permanen" }));
      throw new Error(err?.error || "Gagal hapus permanen");
    }
    setTrashCount((c) => Math.max(0, c - 1));
  }, []);

  useEffect(() => { fetchTrashCount(); const t = window.setInterval(fetchTrashCount, 15000); return () => window.clearInterval(t); }, [fetchTrashCount]);

  const handleUrlsDetected = useCallback((urls: string[], preferBatch: boolean) => {
    if (urls.length === 0) return;
    if (urls.length === 1 && !preferBatch) {
      setInitialAddUrl(urls[0]);
      setIsAddModalOpen(true);
    } else {
      setIsBatchOpen(true);
    }
  }, []);

  const handleAddSingleUrl = useCallback((url: string) => {
    setInitialAddUrl(url);
    setIsAddModalOpen(true);
  }, []);

  useShortcuts({
    onNewDownload: () => { setInitialAddUrl(""); setIsAddModalOpen(true); },
    onSniffer: () => setIsAnalyzerModalOpen(true),
    onBatch: () => setIsBatchOpen(true),
    onSettings: () => setIsSettingsOpen(true),
    onCheatSheet: () => {
      setIsCheatSheetOpen((prev) => {
        if (prev) { setIsSettingsOpen(false); setIsBatchOpen(false); setIsAddModalOpen(false); setIsAnalyzerModalOpen(false); setInspectingTask(null); setPlayingTask(null); setIsWizardOpen(false); setIsTrashOpen(false); return false; }
        return true;
      });
    },
    onOpenTrash: () => { setIsTrashOpen(true); },
    onSearchFocus: () => { setTimeout(() => { searchInputRef.current?.focus(); searchInputRef.current?.select(); }, 20); },
    onCategory: (c) => setCurrentCategory(c),
    onResumeAll: handleResumeAll,
    onPauseAll: handlePauseAll,
  });

  const filteredDownloads = useMemo(() => {
    let list = downloads;

    if (currentCategory === "downloading") {
      list = list.filter((t) => t.status === "downloading" || t.status === "merging");
    } else if (currentCategory === "completed") {
      list = list.filter((t) => t.status === "completed");
    } else if (currentCategory === "paused") {
      list = list.filter((t) => t.status === "paused" || t.status === "error");
    } else if (currentCategory !== "all") {
      list = list.filter((t) => t.category === currentCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) => t.filename.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.filename.localeCompare(b.filename);
      if (sortBy === "size") return b.totalSize - a.totalSize;
      if (sortBy === "speed") return (b.speed || 0) - (a.speed || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [downloads, currentCategory, searchQuery, sortBy]);

  return (
    <div className={`min-h-screen font-sans selection:bg-emerald-500/20 ${theme.isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200/40 via-transparent to-transparent dark:from-slate-800/30 -z-10" />

      <GlobalDropPaste onUrlsDetected={handleUrlsDetected} onAddSingleUrl={handleAddSingleUrl} />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Header
          totalSpeed={stats.totalSpeed}
          activeCount={stats.activeCount}
          completedCount={stats.completedCount}
          connectionStatus={connectionStatus}
          isDark={isDark}
          theme={currentSettings.theme}
          onToggleTheme={toggleTheme}
          speedHistory={speedHistory}
        />

        <Toolbar
          onOpenAddModal={() => { setInitialAddUrl(""); setIsAddModalOpen(true); }}
          onOpenAnalyzerModal={() => setIsAnalyzerModalOpen(true)}
          onOpenWizard={() => setIsWizardOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenBatch={() => setIsBatchOpen(true)}
          onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
          onResumeAll={handleResumeAll}
          onPauseAll={handlePauseAll}
          onClearCompleted={handleClearCompleted}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          hasActiveDownloads={stats.activeCount > 0}
          hasCompletedDownloads={stats.completedCount > 0}
          searchInputRef={searchInputRef}
        />

        <div className="flex flex-col lg:flex-row gap-6">
          <CategorySidebar
            currentCategory={currentCategory}
            onSelectCategory={setCurrentCategory}
            tasks={downloads}
            trashCount={trashCount}
            onOpenTrash={() => setIsTrashOpen(true)}
          />

          <main className="flex-1 min-w-0">
            {filteredDownloads.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[360px] shadow-sm">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 mb-4">
                  <Inbox className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
                  No downloads found in this section
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                  Add a direct download link, use our media sniffer, paste any URL (Ctrl+V), or drag a .txt batch file — all accelerated with IDM-class multi-connection.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => { setInitialAddUrl(""); setIsAddModalOpen(true); }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl text-xs transition-all shadow-sm"
                  >
                    Add Direct Download
                  </button>
                  <button
                    onClick={() => setIsAnalyzerModalOpen(true)}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    Sniff Media Link
                  </button>
                  <button
                    onClick={() => setIsBatchOpen(true)}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-violet-700 dark:text-violet-300 px-4 py-2 rounded-xl text-xs transition-all border border-violet-200 dark:border-violet-800/40 shadow-sm inline-flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Batch Import
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDownloads.map((task) => (
                  <DownloadItem
                    key={task.id}
                    task={task}
                    onPause={handlePause}
                    onResume={handleResume}
                    onDelete={handleDelete}
                    onInspect={setInspectingTask}
                    onPlay={setPlayingTask}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <NewDownloadModal
        isOpen={isAddModalOpen}
        onClose={() => { setInitialAddUrl(""); setIsAddModalOpen(false); }}
        onAddDownload={handleAddDownload}
        defaultConnections={defaultConnections}
        initialUrl={initialAddUrl}
      />

      <MediaAnalyzerModal
        isOpen={isAnalyzerModalOpen}
        onClose={() => setIsAnalyzerModalOpen(false)}
        onStartDownload={handleAddDownload}
      />

      <TaskDetailsModal
        task={inspectingTask}
        onClose={() => setInspectingTask(null)}
        onPlay={setPlayingTask}
      />

      <VideoPlayerModal
        task={playingTask}
        onClose={() => setPlayingTask(null)}
      />

      <SettingsPage
        isOpen={isSettingsOpen}
        initialSettings={currentSettings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <OnboardingWizardModal
        isOpen={isWizardOpen}
        onClose={() => { try { localStorage.setItem("turbodownloader_wizard_completed", "1"); } catch {} setIsWizardOpen(false); }}
        onStartAddDownload={() => { setIsWizardOpen(false); setInitialAddUrl(""); setIsAddModalOpen(true); }}
        onStartMediaSniffer={() => { setIsWizardOpen(false); setIsAnalyzerModalOpen(true); }}
        onTriggerDemoDownload={handleTriggerDemoDownload}
        defaultConnections={defaultConnections}
        onSetDefaultConnections={handleSetDefaultConnections}
      />

      <CheatSheet
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
        onOpenBatch={() => { setIsCheatSheetOpen(false); setIsBatchOpen(true); }}
        onOpenAdd={() => { setIsCheatSheetOpen(false); setInitialAddUrl(""); setIsAddModalOpen(true); }}
        onOpenSniffer={() => { setIsCheatSheetOpen(false); setIsAnalyzerModalOpen(true); }}
        onOpenSettings={() => { setIsCheatSheetOpen(false); setIsSettingsOpen(true); }}
        onSearch={() => { setIsCheatSheetOpen(false); setTimeout(() => { searchInputRef.current?.focus(); searchInputRef.current?.select(); }, 30); }}
      />

      <BatchModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onImport={handleBatchImport}
        defaultConnections={defaultConnections}
      />

      <TrashPage
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        onRefresh={refreshTrash}
        onRestore={restoreTrash}
        onForeverDelete={foreverDeleteTrash}
        retentionDays={currentSettings.trashRetentionDays}
      />
    </div>
  );
}
