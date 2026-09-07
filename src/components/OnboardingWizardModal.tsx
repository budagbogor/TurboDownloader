import React, { useState } from "react";
import {
  Zap,
  Download,
  Sparkles,
  Sliders,
  Cpu,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  Layers,
  ShieldCheck,
  Compass,
  FileDown,
  Activity,
  HardDriveDownload,
  Check,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartAddDownload: () => void;
  onStartMediaSniffer: () => void;
  onTriggerDemoDownload: () => Promise<void>;
  defaultConnections: number;
  onSetDefaultConnections: (conns: number) => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onStartAddDownload,
  onStartMediaSniffer,
  onTriggerDemoDownload,
  defaultConnections,
  onSetDefaultConnections,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  const totalSteps = 5;

  const steps = [
    { id: 1, title: "Pengenalan", subtitle: "Akselerasi Multi-Thread", icon: Zap },
    { id: 2, title: "Unduhan Langsung", subtitle: "Direct File Download", icon: Download },
    { id: 3, title: "Sniffer Media", subtitle: "Ekstraksi Video & Audio", icon: Sparkles },
    { id: 4, title: "Pantau Segmen", subtitle: "Visualisator Thread", icon: Cpu },
    { id: 5, title: "Preferensi & Mulai", subtitle: "Konfigurasi Awal", icon: Sliders },
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem("turbodownloader_wizard_completed", "true");
    }
    onClose();
  };

  const handleRunDemo = async () => {
    setIsDemoLoading(true);
    setDemoSuccess(false);
    try {
      await onTriggerDemoDownload();
      setDemoSuccess(true);
      setTimeout(() => {
        setDemoSuccess(false);
      }, 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Wizard Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200/80 text-emerald-700 shadow-2xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Panduan Pengguna Baru</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800">
                  Langkah {currentStep} / {totalSteps}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pelajari cara memanfaatkan akselerasi IDM, ekstraksi video, dan pemantau segmen
              </p>
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup Panduan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="px-5 py-3 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const isCompleted = step.id < currentStep;
              const isActive = step.id === currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex-1 flex flex-col sm:flex-row items-center sm:items-start gap-1.5 p-1.5 sm:p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold"
                      : isCompleted
                      ? "text-slate-700 hover:bg-slate-50 border border-transparent"
                      : "text-slate-400 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                      isActive
                        ? "bg-emerald-600 text-white font-bold"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                  </div>
                  <div className="hidden sm:block min-w-0">
                    <div className="text-xs truncate font-medium">{step.title}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Main Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-[320px]">
          <AnimatePresence mode="wait">
            {/* Step 1: Overview */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="p-4 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border border-emerald-200/80 rounded-2xl">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Selamat Datang di TurboDownloader!
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                        Aplikasi pengunduh berkas berkecepatan tinggi dengan arsitektur multi-thread cerdas.
                        Koneksi unduhan dipecah menjadi beberapa aliran paralel agar bandwidth ISP Anda terpakai maksimal.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1.5">
                      <Cpu className="w-4 h-4 text-emerald-600" />
                      Dynamic Byte-Range
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Satu berkas besar dipecah menjadi hingga 16–32 segmen independen, memangkas waktu unduh hingga 5x lebih kencang dibanding browser biasa.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1.5">
                      <HardDriveDownload className="w-4 h-4 text-blue-600" />
                      Smart Auto-Merge
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Segmen byte disusun dan digabung secara otomatis begitu selesai di latar belakang tanpa merusak integritas data file.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      Resume & Error Recovery
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Jika koneksi terputus atau dijeda, unduhan dapat dilanjutkan dari persentase terakhir tanpa harus mengulang dari nol.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1.5">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Kategorisasi Otomatis
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Berkas otomatis dikelompokkan ke Video, Audio, Dokumen, Arsip, atau Program untuk kemudahan navigasi.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Direct Download & Live Demo Test */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-600" />
                    Cara Menambah Unduhan Langsung (Direct Download)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Gunakan fitur ini untuk file apa saja seperti ZIP, ISO, PDF, MP4, atau installer aplikasi.
                  </p>
                </div>

                <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 font-sans">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <span>
                      Klik tombol <strong className="text-emerald-700 font-semibold">+ Add Download</strong> pada bilah alat atas.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <span>
                      Tempelkan URL langsung (misal: <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono text-[11px]">https://.../file.zip</code>).
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <span>
                      Geser slider <strong>Connection Threads</strong> (pilih 8 atau 16 streams) lalu klik <strong>Start Accelerated Download</strong>.
                    </span>
                  </div>
                </div>

                {/* Interactive Benchmark Button */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                        Coba Langsung Sekarang (Demo 1-Klik)
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Tambahkan berkas uji 12 MB ke antrean untuk melihat pembagian 8 thread stream secara live.
                      </p>
                    </div>

                    <button
                      onClick={handleRunDemo}
                      disabled={isDemoLoading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer disabled:opacity-60"
                    >
                      {isDemoLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          <span>Menyiapkan...</span>
                        </>
                      ) : demoSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Ditambahkan ke Antrean!</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Unduh File Tes (12MB)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {demoSuccess && (
                    <div className="mt-2 text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Berkas uji berhasil dimasukkan ke daftar antrean. Anda dapat melihat prosesnya langsung setelah menutup panduan ini!
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Media Sniffer */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Sniffer Media & Ekstraksi Video/Audio
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Ekstrak video streaming dengan resolusi penuh dan tanpa watermark dari berbagai platform.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      TikTok No-Watermark
                    </div>
                    <p className="text-xs text-slate-500">
                      Cukup tempel tautan video TikTok, sniffer akan mengekstrak video kualitas murni tanpa logo watermark.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600" />
                      YouTube & Video Streaming
                    </div>
                    <p className="text-xs text-slate-500">
                      Pilihan resolusi fleksibel (1080p, 720p, 480p) atau ekstrak track suara sebagai MP3 murni.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-700">
                    Ingin mencoba ekstrak video sekarang juga?
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onStartMediaSniffer();
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Buka Sniffer</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Segment Visualizer */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-600" />
                    Memantau Segmen Paralel (Waterfall View)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Setiap tugas unduhan memiliki tombol inspeksi detail segmen thread untuk transparansi kecepatan penuh.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Cara Melihat Detail Thread:
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Klik tombol <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[11px] text-emerald-700 font-semibold">Streams (8)</span> pada kartu unduhan untuk membuka grafik batang segmen koneksi real-time.
                  </p>

                  <div className="pt-2 border-t border-slate-200/70 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                      <span className="font-semibold text-slate-800">Streaming</span>
                      <div className="text-[10px] text-slate-500 font-sans">Aktif mengisi byte</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
                      <span className="font-semibold text-slate-800">Selesai</span>
                      <div className="text-[10px] text-slate-500 font-sans">Segmen komplit</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
                      <span className="font-semibold text-slate-800">Dijeda</span>
                      <div className="text-[10px] text-slate-500 font-sans">Pause aman</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1.5" />
                      <span className="font-semibold text-slate-800">Merging</span>
                      <div className="text-[10px] text-slate-500 font-sans">Penggabungan berkas</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-100/80 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Anda dapat menjeda atau melanjutkan seluruh unduhan sekaligus dengan tombol <strong>Pause All</strong> dan <strong>Resume All</strong> di bilah atas.
                  </span>
                </div>
              </motion.div>
            )}

            {/* Step 5: Quick Settings & Ready */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    Preferensi Awal & Siap Mengunduh
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sesuaikan jumlah stream standar sesuai kebutuhan koneksi internet Anda.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Jumlah Stream Default untuk Unduhan Baru:
                  </label>

                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { val: 4, label: "4 Streams", desc: "Koneksi Terbatas / Hemat" },
                      { val: 8, label: "8 Streams", desc: "Rekomendasi Optimal" },
                      { val: 16, label: "16 Streams", desc: "Turbo Maksimal (IDM)" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => onSetDefaultConnections(opt.val)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          defaultConnections === opt.val
                            ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-medium shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{opt.label}</span>
                          {defaultConnections === opt.val && (
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <FileDown className="w-4 h-4 text-emerald-600" />
                    Folder Penyimpanan Berkas:
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                    ~/Downloads/TurboDownloader
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dontShowAgainCheck"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="dontShowAgainCheck" className="text-xs text-slate-600 cursor-pointer select-none">
                    Tandai panduan ini sudah selesai dibaca (dapat dibuka kembali via menu Toolbar kapan saja).
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <div>
            {currentStep > 1 && (
              <button
                onClick={handlePrev}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleComplete}
              className="px-3.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Lewati
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleComplete();
                    onStartAddDownload();
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tambah Unduhan</span>
                </button>
                <button
                  onClick={handleComplete}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Selesai & Jelajahi</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
