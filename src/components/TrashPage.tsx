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
      case "completed": return "chip-success chip";
      case "downloading":
      case "merging": return "bg-sky-50 text-sky-700 border-sky-200 chip";
      case "error": return "chip-danger chip";
      case "paused": return "chip-warning chip";
      default: return "chip chip-default";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[88vh] surface-card rounded-2xl flex flex-col overflow-hidden shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-muted shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-danger-50 rounded-xl border border-danger-100">
              <Trash2 className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                Trash / Recycle Bin
                <span className="chip chip-danger font-semibold">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </span>
              </h2>
              <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Auto purge permanen setelah {retentionDays} hari sejak dihapus
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 rounded-md hover:bg-subtle text-secondary disabled:opacity-50"
              title="Refresh trash list"
              aria-label="Refresh trash"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-subtle text-secondary"
              aria-label="Close trash"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 flex-1 space-y-4 scroll-soft">
          {lastError && (
            <div className="rounded-xl2 bg-danger-50 border border-danger-100 px-3 py-2 text-xs text-danger-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>{lastError}</div>
            </div>
          )}

          {loading && items.length === 0 ? (
            <div className="py-16 text-center text-muted text-sm">
              <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-60" />
              Memuat daftar trash…
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="p-4 bg-muted rounded-2xl border border-muted text-muted inline-flex mb-3">
                <ArchiveRestore className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-on-surface mb-1">Tempat sampah kosong</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Task yang kamu hapus akan muncul di sini selama {retentionDays} hari sebelum dihapus permanen otomatis oleh sistem.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-subtle border border-muted rounded-xl overflow-hidden bg-elevated">
              {items.map((it) => {
                const busy = busyIds.has(it.id);
                const confirm = confirmId === it.id;
                const expiredAt = it.deletedAt + retentionDays * 24 * 60 * 60 * 1000;
                const remainMs = Math.max(0, expiredAt - Date.now());
                const remainDays = Math.ceil(remainMs / (24 * 60 * 60 * 1000));
                return (
                  <li key={it.id} className="p-3 hover:bg-subtle transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg border border-muted text-secondary shrink-0">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-on-surface truncate" title={it.filename}>
                              {it.filename}
                            </div>
                            <div className="mt-0.5 text-[11px] font-mono text-muted truncate" title={it.url}>
                              {it.url.substring(0, 88)}{it.url.length > 88 ? "…" : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold capitalize ${statusColor(it.status)}`}>
                              {it.status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                          <span className="inline-flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {formatBytes(it.downloadedSize)} / {formatBytes(it.totalSize)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Deleted {formatRelativeTime(it.deletedAt)} ·
                            <span className={remainDays <= 3 ? "text-danger-600 font-semibold ml-1" : ""}>
                              sisa {remainDays} hari
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-muted">
                            conn × {it.numConnections}
                          </span>
                          {it.error && (
                            <span className="inline-flex items-center gap-1 text-danger-600 max-w-[240px] truncate" title={it.error}>
                              <AlertTriangle className="w-3 h-3" />
                              {it.error}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-slate-400 to-slate-500 rounded-full"
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Restore ${it.filename}`}
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                              Restore
                            </button>
                            <button
                              onClick={() => setConfirmId(it.id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-danger-50 text-danger-700 border border-danger-100 hover:bg-danger-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Delete ${it.filename} permanently`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="text-[10px] font-semibold text-danger-700 text-center mb-0.5">
                              Yakin hapus permanen?
                            </div>
                            <button
                              onClick={() => doDeleteForever(it.id)}
                              disabled={busy}
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-danger-600 hover:bg-danger-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Ya, Hapus
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              disabled={busy}
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-secondary border border-muted hover:bg-subtle disabled:opacity-50"
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

        <div className="flex items-center justify-between px-6 py-3 border-t border-muted bg-muted/50 shrink-0">
          <div className="text-[11px] text-muted inline-flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-warning-600" />
            Delete permanen akan menghapus row task + event log dari database (file di disk tetap tersimpan).
          </div>
          <button
            onClick={onClose}
            className="chip chip-default"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrashPage;
