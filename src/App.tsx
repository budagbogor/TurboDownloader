import React, { useState, useEffect, useRef, useMemo } from "react";
import { DownloadTask, CategoryType, SystemStats } from "./types";
import { Header } from "./components/Header";
import { CategorySidebar } from "./components/CategorySidebar";
import { Toolbar } from "./components/Toolbar";
import { DownloadItem } from "./components/DownloadItem";
import { NewDownloadModal } from "./components/NewDownloadModal";
import { MediaAnalyzerModal } from "./components/MediaAnalyzerModal";
import { TaskDetailsModal } from "./components/TaskDetailsModal";
import { OnboardingWizardModal } from "./components/OnboardingWizardModal";
import { VideoPlayerModal } from "./components/VideoPlayerModal";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { Download, Inbox, Layers } from "lucide-react";

export default function App() {
  const [downloads, setDownloads] = useState<DownloadTask[]>([]);
  const [currentCategory, setCurrentCategory] = useState<CategoryType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size" | "speed">("date");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAnalyzerModalOpen, setIsAnalyzerModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [inspectingTask, setInspectingTask] = useState<DownloadTask | null>(null);
  const [playingTask, setPlayingTask] = useState<DownloadTask | null>(null);

  // Default connection preferences
  const [defaultConnections, setDefaultConnections] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("turbodownloader_default_connections");
      return saved ? parseInt(saved, 10) : 8;
    } catch {
      return 8;
    }
  });

  const handleSetDefaultConnections = (conns: number) => {
    setDefaultConnections(conns);
    try {
      localStorage.setItem("turbodownloader_default_connections", conns.toString());
    } catch (e) {
      console.error(e);
    }
  };

  // Show Wizard on first visit
  useEffect(() => {
    try {
      const wizardSeen = localStorage.getItem("turbodownloader_wizard_completed");
      if (!wizardSeen) {
        setIsWizardOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const notifiedDownloads = useRef<Set<string>>(new Set());

  // Request notifications on mobile if native
  useEffect(() => {
    const requestPermissions = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        await LocalNotifications.requestPermissions();
      } catch (e) {
        console.error("Failed to request notification permissions", e);
      }
    };
    requestPermissions();
  }, []);

  // Polling data & notification trigger
  useEffect(() => {
    let isMounted = true;
    let consecutiveErrors = 0;
    let timeoutId: NodeJS.Timeout | null = null;

    const fetchDownloads = async () => {
      try {
        const res = await fetch("/api/downloads");
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data: DownloadTask[] = await res.json();
            if (!isMounted) return;
            consecutiveErrors = 0;

            // Check for completed downloads to notify
            data.forEach((task) => {
              if (task.status === "completed" && !notifiedDownloads.current.has(task.id)) {
                notifiedDownloads.current.add(task.id);
                triggerNotification(task);
              }
            });

            setDownloads(data);

            // Update inspecting task if open
            if (inspectingTask) {
              const updated = data.find((t) => t.id === inspectingTask.id);
              if (updated) setInspectingTask(updated);
            }
          }
        }
      } catch (e) {
        if (!isMounted) return;
        consecutiveErrors++;
      } finally {
        if (isMounted) {
          const nextDelay = consecutiveErrors > 0 ? Math.min(4000, 1000 * Math.pow(1.3, consecutiveErrors)) : 1000;
          timeoutId = setTimeout(fetchDownloads, nextDelay);
        }
      }
    };

    const triggerNotification = async (task: DownloadTask) => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "Download Finished",
              body: `"${task.filename}" completed successfully!`,
              id: Math.floor(Math.random() * 1000000),
              schedule: { at: new Date(Date.now() + 500) },
            },
          ],
        });
      } catch (e) {
        console.error("Notification schedule error", e);
      }
    };

    fetchDownloads();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [inspectingTask]);

  // Aggregate Stats
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

    return {
      totalTasks: downloads.length,
      activeCount,
      completedCount,
      pausedCount,
      totalSpeed,
    };
  }, [downloads]);

  // Action handlers
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
      setDownloads((prev) => prev.filter((d) => d.id !== id));
      if (inspectingTask?.id === id) setInspectingTask(null);
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const handlePauseAll = async () => {
    try {
      await fetch("/api/downloads/pause-all", { method: "POST" });
    } catch (e) {
      console.error("Pause all error:", e);
    }
  };

  const handleResumeAll = async () => {
    try {
      await fetch("/api/downloads/resume-all", { method: "POST" });
    } catch (e) {
      console.error("Resume all error:", e);
    }
  };

  const handleClearCompleted = async () => {
    try {
      await fetch("/api/downloads/clear-completed", { method: "POST" });
      setDownloads((prev) => prev.filter((d) => d.status !== "completed"));
    } catch (e) {
      console.error("Clear completed error:", e);
    }
  };

  // Filtered and Sorted Downloads
  const filteredDownloads = useMemo(() => {
    let list = downloads;

    // Filter by Category or status
    if (currentCategory === "downloading") {
      list = list.filter((t) => t.status === "downloading" || t.status === "merging");
    } else if (currentCategory === "completed") {
      list = list.filter((t) => t.status === "completed");
    } else if (currentCategory === "paused") {
      list = list.filter((t) => t.status === "paused" || t.status === "error");
    } else if (currentCategory !== "all") {
      list = list.filter((t) => t.category === currentCategory);
    }

    // Filter by Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) => t.filename.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.filename.localeCompare(b.filename);
      if (sortBy === "size") return b.totalSize - a.totalSize;
      if (sortBy === "speed") return (b.speed || 0) - (a.speed || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [downloads, currentCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500/20">
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200/40 via-transparent to-transparent -z-10" />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Main Application Header */}
        <Header
          totalSpeed={stats.totalSpeed}
          activeCount={stats.activeCount}
          completedCount={stats.completedCount}
        />

        {/* Global Toolbar */}
        <Toolbar
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenAnalyzerModal={() => setIsAnalyzerModalOpen(true)}
          onOpenWizard={() => setIsWizardOpen(true)}
          onResumeAll={handleResumeAll}
          onPauseAll={handlePauseAll}
          onClearCompleted={handleClearCompleted}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          hasActiveDownloads={stats.activeCount > 0}
          hasCompletedDownloads={stats.completedCount > 0}
        />

        {/* Main Workspace Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Category & Queue Sidebar */}
          <CategorySidebar
            currentCategory={currentCategory}
            onSelectCategory={setCurrentCategory}
            tasks={downloads}
          />

          {/* Right Download Task List Area */}
          <main className="flex-1 min-w-0">
            {filteredDownloads.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[360px] shadow-sm">
                <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-slate-400 mb-4">
                  <Inbox className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">
                  No downloads found in this section
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-6">
                  Add a direct download link or use our media sniffer to capture streams with IDM-class acceleration.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl text-xs transition-all shadow-sm"
                  >
                    Add Direct Download
                  </button>
                  <button
                    onClick={() => setIsAnalyzerModalOpen(true)}
                    className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs transition-all border border-slate-200 shadow-sm"
                  >
                    Sniff Media Link
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

      {/* Direct Add Download Modal */}
      <NewDownloadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddDownload={handleAddDownload}
        defaultConnections={defaultConnections}
      />

      {/* Media Analyzer & Sniffer Modal */}
      <MediaAnalyzerModal
        isOpen={isAnalyzerModalOpen}
        onClose={() => setIsAnalyzerModalOpen(false)}
        onStartDownload={handleAddDownload}
      />

      {/* Task Details & Property Inspector Modal */}
      <TaskDetailsModal
        task={inspectingTask}
        onClose={() => setInspectingTask(null)}
        onPlay={setPlayingTask}
      />

      {/* In-App Video Player & Compatibility Repair Modal */}
      <VideoPlayerModal
        task={playingTask}
        onClose={() => setPlayingTask(null)}
      />

      {/* Interactive Onboarding Wizard for New Users */}
      <OnboardingWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onStartAddDownload={() => setIsAddModalOpen(true)}
        onStartMediaSniffer={() => setIsAnalyzerModalOpen(true)}
        onTriggerDemoDownload={handleTriggerDemoDownload}
        defaultConnections={defaultConnections}
        onSetDefaultConnections={handleSetDefaultConnections}
      />
    </div>
  );
}
