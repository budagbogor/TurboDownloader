import React, { useEffect, useMemo, useState } from "react";
import { X, RotateCcw, Trash2, AlertTriangle, Calendar, HardDrive, ArchiveRestore } from "lucide-react";
import { formatBytes, formatRelativeTime } from "../lib/utils";
import type { TrashItem } from "../types";

interface TrashPageProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<TrashItem[]>;
  onRestore: (id: string) => Promise<void>;
  onForeverDelete: (id: string) => Promise<void>;
  retentionDays: number;
}

export const TrashPage: React.FC<TrashPageProps> = ({ isOpen, onClose, onRefresh, onRestore, onForeverDelete, retentionDays }) => {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useMemo(() => async () => {
    setLoading(true);
    setLastError(null);
    try {
      const list = await onRefresh();
      setItems(list);
    } catch (e: any) {
      setLastError(e?.message || "Gagal mengambil data trash");
    } finally {
      setLoading(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (isOpen) {
      refresh();
      setConfirmId(null);
      setBusyIds(new Set());
      setLastError(null);
    }
  }, [isOpen, refresh]);

  if (!isOpen) return null;

  const doRestore = async (id: string) => {
    setBusyIds((prev) => new Set(prev).add(id));
    setLastError(null);
    try {
      await onRestore(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      setLastError(e?.message || "Gagal restore");
    } finally {
      setBusyIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const doDeleteForever = async (id: string) => {
    setBusyIds((prev) => new Set(prev).add(id));
    setLastError(null);
    try {
      await onForeverDelete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setConfirmId(null);
    } catch (e: any) {
      setLastError(e?.message || "Gagal hapus permanen");
    } finally {
      setBusyIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50";
      case "downloading":
      case "merging": return "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/50";
      case "error": return "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50";
      case "paused": return "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50";
      default: return "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[88vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/25 rounded-xl border border-rose-100 dark:border-rose-800/50">
              <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Trash / Recycle Bin
                <span className="text-[10px] font-mono font-semibold bg-rose-50 dark:bg-rose-900/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 px-2 py-0.5 rounded-full">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Auto purge permanen setelah {retentionDays} hari sejak dihapus
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-50"
              title="Refresh trash list"
              aria-label="Refresh trash"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              aria-label="Close trash"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 flex-1 space-y-4">
          {lastError && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>{lastError}</div>
            </div>
          )}

          {loading && items.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
              <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-60" />
              Memuat daftar trash…
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 inline-flex mb-3">
                <ArchiveRestore className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Tempat sampah kosong</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Task yang kamu hapus akan muncul di sini selama {retentionDays} hari sebelum dihapus permanen otomatis oleh sistem.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              {items.map((it) => {
                const busy = busyIds.has(it.id);
                const confirm = confirmId === it.id;
                const expiredAt = it.deletedAt + retentionDays * 24 * 60 * 60 * 1000;
                const remainMs = Math.max(0, expiredAt - Date.now());
                const remainDays = Math.ceil(remainMs / (24 * 60 * 60 * 1000));
                return (
                  <li key={it.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate" title={it.filename}>
                              {it.filename}
                            </div>
                            <div className="mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate" title={it.url}>
                              {it.url.substring(0, 88)}{it.url.length > 88 ? "…" : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold capitalize ${statusColor(it.status)}`}>
                              {it.status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {formatBytes(it.downloadedSize)} / {formatBytes(it.totalSize)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Deleted {formatRelativeTime(it.deletedAt)} ·
                            <span className={remainDays <= 3 ? "text-rose-600 dark:text-rose-400 font-semibold ml-1" : ""}>
                              sisa {remainDays} hari
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            conn × {it.numConnections}
                          </span>
                          {it.error && (
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 max-w-[240px] truncate" title={it.error}>
                              <AlertTriangle className="w-3 h-3" />
                              {it.error}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-500 dark:to-slate-400 rounded-full"
                            style={{ width: `${Math.min(100, it.totalSize > 0 ? (it.downloadedSize / it.totalSize) * 100 : 0)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-stretch gap-1.5 shrink-0">
                        {!confirm ? (
                          <>
                            <button
                              onClick={() => doRestore(it.id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-900/25 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Restore ${it.filename}`}
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                              Restore
                            </button>
                            <button
                              onClick={() => setConfirmId(it.id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-900/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Delete ${it.filename} permanently`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 text-center mb-0.5">
                              Yakin hapus permanen?
                            </div>
                            <button
                              onClick={() => doDeleteForever(it.id)}
                              disabled={busy}
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Ya, Hapus
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              disabled={busy}
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                            >
                              Batal
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Delete permanen akan menghapus row task + event log dari database (file di disk tetap tersimpan).
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrashPage;
