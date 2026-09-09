import React, { useEffect, useState } from "react";
import { X, Save, Bell, FolderOpen, Radio, Wifi, Eye, Trash2, Palette, Network, Sliders } from "lucide-react";
import { AppSettings } from "../types";

interface SettingsPageProps {
  isOpen: boolean;
  initialSettings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => Promise<boolean>;
}

const QUALITY_OPTIONS = ["best", "2160p", "1440p", "1080p", "720p", "480p", "360p"];
const THEME_OPTIONS = ["system", "light", "dark"] as const;
const TABS = [
  { key: "general", label: "General", icon: Sliders },
  { key: "network", label: "Networking", icon: Network },
  { key: "quality", label: "Quality", icon: Eye },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "advanced", label: "Advanced", icon: Palette },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const BoolToggle: React.FC<{
  value: number;
  onChange: (v: number) => void;
  label: string;
  description: string;
}> = ({ value, onChange, label, description }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-slate-800">
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{description}</div>
    </div>
    <button
      type="button"
      onClick={() => onChange(value ? 0 : 1)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
        value ? "bg-indigo-600" : "bg-gray-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

const TextInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  label: string;
  description: string;
  placeholder?: string;
  type?: string;
}> = ({ value, onChange, label, description, placeholder, type = "text" }) => (
  <div className="py-3 border-b border-gray-100 dark:border-slate-800">
    <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">{label}</label>
    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">{description}</div>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  </div>
);

const NumberSlider: React.FC<{
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  label: string;
  description: string;
  zeroLabel?: string;
}> = ({ value, min, max, step, unit, onChange, label, description, zeroLabel }) => (
  <div className="py-3 border-b border-gray-100 dark:border-slate-800">
    <div className="flex items-center justify-between mb-1">
      <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">{label}</label>
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
        {value === 0 && zeroLabel ? zeroLabel : `${value} ${unit}`}
      </span>
    </div>
    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">{description}</div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="w-full accent-indigo-600"
    />
  </div>
);

const SelectField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  description: string;
}> = ({ value, onChange, options, label, description }) => (
  <div className="py-3 border-b border-gray-100 dark:border-slate-800">
    <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">{label}</label>
    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">{description}</div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({ isOpen, initialSettings, onClose, onSave }) => {
  const [tab, setTab] = useState<TabKey>("general");
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings);
      setTab("general");
      setSaveError(null);
    }
  }, [isOpen, initialSettings]);

  if (!isOpen) return null;

  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const ok = await onSave(settings);
      if (ok) onClose();
      else setSaveError("Server gagal menyimpan pengaturan. Coba kembali.");
    } catch (e: any) {
      setSaveError(e?.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Settings</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Konfigurasi aplikasi disimpan permanen ke database
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav className="w-48 shrink-0 border-r border-gray-200 dark:border-slate-800 p-2 bg-gray-50/50 dark:bg-slate-900/50">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md mb-1 text-left transition ${
                    active
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium"
                      : "text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 overflow-y-auto p-6">
            {tab === "general" && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">General</div>
                <TextInput
                  value={settings.defaultDownloadDir}
                  onChange={(v) => patch("defaultDownloadDir", v)}
                  label="Download Directory"
                  description="Folder lokasi file disimpan. Bisa menggunakan path relatif (./downloads) atau absolute (C:/Users/name/Downloads)."
                  placeholder="./downloads"
                />
                <SelectField
                  value={settings.theme}
                  onChange={(v) => patch("theme", v as AppSettings["theme"])}
                  options={[
                    { value: "system", label: "System (match OS)" },
                    { value: "light", label: "Light Mode" },
                    { value: "dark", label: "Dark Mode" },
                  ]}
                  label="UI Theme"
                  description="Pilih tema tampilan. System akan otomatis mengikuti preferensi sistem operasi."
                />
                <NumberSlider
                  value={settings.trashRetentionDays}
                  min={1}
                  max={90}
                  step={1}
                  unit="hari"
                  onChange={(v) => patch("trashRetentionDays", v)}
                  label="Trash Retention"
                  description="Berapa lama item di tempat sampah sebelum dihapus permanen otomatis oleh sistem."
                />
                <BoolToggle
                  value={settings.autoMergeSegments}
                  onChange={(v) => patch("autoMergeSegments", v)}
                  label="Auto Merge Segments"
                  description="Secara otomatis menggabungkan potongan-potongan hasil multi-connection download setelah semua selesai."
                />
                <BoolToggle
                  value={settings.autoOptimizeMp4}
                  onChange={(v) => patch("autoOptimizeMp4", v)}
                  label="Auto Optimize MP4"
                  description="Jalankan ffmpeg faststart pada file MP4 supaya kompatibel diputar di browser (moov atom di depan)."
                />
              </div>
            )}

            {tab === "network" && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Networking</div>
                <NumberSlider
                  value={settings.maxConcurrentDownloads}
                  min={1}
                  max={16}
                  step={1}
                  unit="tugas"
                  onChange={(v) => patch("maxConcurrentDownloads", v)}
                  label="Concurrent Downloads"
                  description="Jumlah maksimal task download yang berjalan paralel bersamaan. Meningkatkan nilai ini mempercepat banyak task kecil tapi membebani CPU/RAM."
                />
                <NumberSlider
                  value={settings.defaultConnections}
                  min={1}
                  max={32}
                  step={1}
                  unit="conn"
                  onChange={(v) => patch("defaultConnections", v)}
                  label="Default Connections / Task"
                  description="Jumlah paralel HTTP connection per download (Range requests). Jumlah optimal 8-16 untuk file besar."
                />
                <NumberSlider
                  value={settings.maxBandwidthKbps}
                  min={0}
                  max={100000}
                  step={100}
                  unit="KB/s"
                  onChange={(v) => patch("maxBandwidthKbps", v)}
                  label="Global Bandwidth Limit"
                  description="Batasi kecepatan transfer keseluruhan (0 = unlimited). Berguna ketika aplikasi dipakai di jaringan bersama."
                  zeroLabel="Unlimited"
                />
              </div>
            )}

            {tab === "quality" && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Quality & Engines</div>
                <SelectField
                  value={settings.defaultVideoQuality}
                  onChange={(v) => patch("defaultVideoQuality", v)}
                  options={QUALITY_OPTIONS.map((q) => ({ value: q, label: q === "best" ? "Best Available" : q }))}
                  label="Default Video Quality"
                  description="Kualitas pilihan utama untuk YouTube / Vimeo / platform lain yang menyediakan multiple resolution."
                />
                <TextInput
                  value={settings.youtubeCookiePath}
                  onChange={(v) => patch("youtubeCookiePath", v)}
                  label="YouTube cookies.txt Path"
                  description="Path absolut ke file Netscape cookies.txt (export dari browser). Dibutuhkan untuk konten usia terbatas atau jika IP server terblokir oleh YouTube."
                  placeholder="C:/Users/name/Downloads/youtube_cookies.txt"
                />
                <TextInput
                  value={settings.instagramCookieHeader}
                  onChange={(v) => patch("instagramCookieHeader", v)}
                  label="Instagram Cookie (raw header)"
                  description="Nilai header Cookie mentah (copy dari DevTools Network tab). Dibutuhkan untuk download reel/story Instagram yang tidak public."
                  placeholder="sessionid=xxx; ds_user_id=yyy; csrftoken=zzz..."
                />
              </div>
            )}

            {tab === "notifications" && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Notifications</div>
                <BoolToggle
                  value={settings.enableBrowserNotifications}
                  onChange={(v) => patch("enableBrowserNotifications", v)}
                  label="Browser Notifications"
                  description="Gunakan Web Notification API browser untuk notifikasi desktop ketika download selesai. Membutuhkan izin browser."
                />
                <BoolToggle
                  value={settings.notificationsEnabled}
                  onChange={(v) => patch("notificationsEnabled", v)}
                  label="In-App Toasts & Audio"
                  description="Tampilkan notifikasi toast di dalam aplikasi + suara beep untuk event penting (selesai/gagal)."
                />
              </div>
            )}

            {tab === "advanced" && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Advanced</div>
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Radio className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-amber-900 dark:text-amber-200">Experimental</div>
                      <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                        Pengaturan di bawah dapat mempengaruhi stabilitas. Ubah hanya jika memahami konsekuensi.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Wifi className="w-4 h-4" /> Engines Used
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      yt-dlp (universal 1000+ sites) • play-dl (YouTube) • axios (HTTP direct) • ffmpeg (merge/optimize)
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Active</div>
                </div>
                <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" /> Data Store
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      SQLite WAL tasks/settings/event_log tables with debounce 5s bulk transaction.
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">WAL Mode</div>
                </div>
                <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" /> Soft Delete
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Task yang dihapus masuk ke Trash (marked deleted_at) selama {settings.trashRetentionDays} hari, lalu di-purge otomatis.
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Enabled</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
          {saveError && (
            <span className="text-xs text-red-600 dark:text-red-400 mr-auto">{saveError}</span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
