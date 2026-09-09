import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import os from "os";

import {
  DownloadStatus,
  Segment,
  DownloadTaskJson,
  DownloadCategory,
  debugReport,
  dbgReport,
} from "./task-types.js";
import {
  detectSocialPlatforms,
  extractFacebook,
  extractTikTok,
  extractYouTubePreInfo,
  socialMediaYtDlFallback,
  YtDlTrackState,
} from "./media-extractors.js";
import {
  analyzeUniversalMedia,
  detectPlatform,
  listSupportedPlatforms,
} from "./universal-extractors.js";
import {
  detectYouTubeCdn,
  buildStreamingHeaders,
  probeTarget,
  autoDetectFilenameFromUrl,
  createSegmentsList,
  downloadSegmentWithRetry,
  DownloadSegmentCtx,
} from "./direct-http-downloader.js";
import {
  mergeSegments as ffmpegMergeSegments,
  streamMerge,
  optimizeVideoForCompatibility,
} from "./ffmpeg-toolchain.js";
import {
  startYoutubeDlDownload,
  YtDlHandlerCtx,
} from "./youtube-dl-handler.js";

export class DownloadTask {
  public id: string;
  public url: string;
  public filename: string;
  public totalSize: number = 0;
  public downloadedSize: number = 0;
  public status: DownloadStatus = "pending";
  public speed: number = 0;
  public error?: string;
  public isSocialMedia: boolean = false;
  public createdAt: number = Date.now();
  public numConnections: number = 8;

  private segments: Segment[] = [];
  private tempDir: string;
  private outputDir: string;
  private lastDownloadedSize: number = 0;
  private speedInterval: NodeJS.Timeout | null = null;
  private downloadUrl: string = "";
  private supportsRange: boolean = false;
  public isCancelled: boolean = false;
  private isYouTubeCdn: boolean = false;
  public socialExtractorFailed: boolean = false;
  public useYoutubeDlDirect: boolean = false;
  public originalYouTubeUrl: string = "";
  public youtubeDlProcess: any = null;
  public ytDlEstimatedTotal: number = 0;
  public ytDlDownloadedAccum: number = 0;
  public ytDlLastTrackDownloaded: number = 0;
  public ytDlTrackCountSeen: number = 0;
  public ytDlLastTrackPeak: number = 0;
  public ytDlStableTotalLocked: boolean = false;

  constructor(url: string, filename?: string, connections?: number) {
    this.id = uuidv4();
    this.url = (url || "").trim();
    this.filename = this.sanitizeFilename(filename || `download_${this.id.substring(0, 8)}`);
    this.numConnections = Math.max(1, Math.min(32, connections || 8));

    this.outputDir = path.join(process.cwd(), "downloads");
    this.tempDir = path.join(os.tmpdir(), "turbodownloader_temp", this.id);

    try {
      if (!fs.existsSync(this.tempDir)) fs.mkdirSync(this.tempDir, { recursive: true });
      if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });
    } catch (err) {
      console.error("Failed to initialize directory:", err);
    }
  }

  private sanitizeFilename(name: string): string {
    let clean = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
    clean = clean.replace(/^[.\s]+|[.\s]+$/g, "");
    return clean || `download_${Date.now()}`;
  }

  private normalizeUrl(inputUrl: string): string {
    const trimmed = inputUrl.trim();
    if (trimmed.startsWith("/")) return `http://127.0.0.1:3000${trimmed}`;
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }

  async initialize(): Promise<void> {
    try {
      const { isFb, isTikTok, isYouTube, isInstagram, isSocial } = detectSocialPlatforms(this.url);
      this.isSocialMedia = isSocial;

      const platformInfo = detectPlatform(this.url);

      debugReport("A", "DownloadTask.ts:initialize", "[DEBUG] Initialize download task", {
        taskId: this.id, inputUrl: this.url, filename: this.filename,
        numConnections: this.numConnections, isSocialMedia: this.isSocialMedia,
        isYouTube, isTikTok, isFb, platform: platformInfo.key,
      });

      const extOpts = {
        taskId: this.id, url: this.url,
        sanitizeFilename: (s: string) => this.sanitizeFilename(s),
        currentFilename: this.filename,
      };

      let usedLegacy = false;
      if (isFb) {
        const res = await extractFacebook(extOpts);
        this.downloadUrl = res.downloadUrl;
        this.filename = res.filename;
        usedLegacy = true;
      } else if (isTikTok) {
        const res = await extractTikTok(extOpts);
        this.downloadUrl = res.downloadUrl;
        this.filename = res.filename;
        this.totalSize = res.totalSize;
        usedLegacy = true;
      } else if (isYouTube) {
        this.originalYouTubeUrl = this.url;
        this.useYoutubeDlDirect = true;
        console.log(`[Task ${this.id}] Using youtube-dl direct mode for YouTube reliability.`);
        const res = await extractYouTubePreInfo(extOpts);
        this.downloadUrl = res.downloadUrl;
        this.filename = res.filename;
        this.originalYouTubeUrl = res.normalizedUrl;
        this.ytDlEstimatedTotal = res.ytEstimate;
        this.totalSize = res.ytEstimate;
        this.ytDlDownloadedAccum = 0;
        this.ytDlLastTrackDownloaded = 0;
        this.ytDlTrackCountSeen = 0;
        this.ytDlLastTrackPeak = 0;
        this.ytDlStableTotalLocked = res.ytEstimate > 0;
        usedLegacy = true;
      }

      if (!usedLegacy || (this.isSocialMedia && !this.downloadUrl)) {
        try {
          const analyzed = await analyzeUniversalMedia(this.url);
          debugReport("A", "DownloadTask.ts:initialize", "[DEBUG] Universal analyze result", {
            taskId: this.id,
            platform: analyzed.platform.key,
            title: analyzed.title,
            formatCount: analyzed.formats.length,
            requiresYtDlp: analyzed.requiresYtDlpDownload,
          });
          const best = analyzed.formats[0];
          if (best) {
            if (!this.downloadUrl) this.downloadUrl = best.url || this.url;
            if (best.title && (!this.filename || this.filename.startsWith("download_"))) {
              const safeTitle = this.sanitizeFilename(best.title);
              const ext = best.format?.split("/")?.[1]?.split(";")?.[0];
              if (ext && !safeTitle.endsWith(`.${ext}`)) this.filename = `${safeTitle}.${ext}`;
              else this.filename = safeTitle;
            }
            if (best.size && this.totalSize === 0) this.totalSize = best.size;
            if (analyzed.requiresYtDlpDownload && !isYouTube) {
              this.useYoutubeDlDirect = true;
              this.numConnections = 1;
              this.supportsRange = false;
            }
          }
        } catch (uniErr: any) {
          debugReport("C", "DownloadTask.ts:initialize", "[DEBUG] Universal extractor fallback failed", {
            taskId: this.id, error: uniErr?.message || String(uniErr),
          });
        }
      }

      if (this.isSocialMedia && !this.downloadUrl) {
        const fallbackOpts = { ...extOpts, isSocialMedia: this.isSocialMedia };
        const fallback = await socialMediaYtDlFallback(fallbackOpts);
        if (fallback.downloadUrl) this.downloadUrl = fallback.downloadUrl;
        this.filename = fallback.filename;
        this.totalSize = fallback.totalSize || this.totalSize;
        if (fallback.extractorFailed) this.socialExtractorFailed = true;
      }

      if (!this.downloadUrl) {
        if (this.isSocialMedia) {
          this.socialExtractorFailed = true;
          if (platformInfo.key !== "generic") {
            this.useYoutubeDlDirect = true;
            this.numConnections = 1;
            this.supportsRange = false;
            this.downloadUrl = this.url;
          } else {
            throw new Error(
              "Gagal mengekstrak video media sosial: Tidak dapat memperoleh tautan unduhan langsung. " +
              "Gunakan fitur 'Sniff Media Link' terlebih dahulu untuk memilih resolusi, atau pastikan video bersifat publik dan tidak dibatasi usia."
            );
          }
        } else {
          this.downloadUrl = this.url;
        }
      }

      const targetUrl = this.normalizeUrl(this.downloadUrl);
      this.isYouTubeCdn = detectYouTubeCdn(targetUrl);

      if (this.useYoutubeDlDirect) {
        this.numConnections = 1;
        this.supportsRange = false;
      } else if (this.isYouTubeCdn || this.isSocialMedia) {
        console.log(`[Task ${this.id}] YouTube/CDN detected, forcing single-stream mode for reliability.`);
        this.numConnections = 1;
        this.supportsRange = false;
      }

      debugReport("A", "DownloadTask.ts:initialize", "[DEBUG] Resolved target URL before probe", {
        taskId: this.id, originalUrl: this.url, downloadUrl: this.downloadUrl, targetUrl,
        filename: this.filename, isYouTubeCdn: this.isYouTubeCdn, useYoutubeDlDirect: this.useYoutubeDlDirect,
      });

      if (this.useYoutubeDlDirect) {
        this.createSegments();
      } else if (!this.isYouTubeCdn) {
        await this.probeTargetWrapper(targetUrl);
        this.createSegments();
      } else {
        if (this.totalSize === 0) {
          try { await this.probeTargetWrapper(targetUrl); }
          catch (probeErr: any) {
            console.warn(`[Task ${this.id}] YouTube CDN probe skipped/failed (${probeErr.message}), will stream blind.`);
          }
        }
        this.createSegments();
      }

      // #region debug-point H4/H5:initialize-end
      dbgReport("H4", "DownloadTask.ts:initialize:end", "[DEBUG] H4 initialize ended resolve state", { taskId: this.id, status: this.status, useYoutubeDlDirect: this.useYoutubeDlDirect, totalSize: this.totalSize, downloadUrl: String(this.downloadUrl || "").substring(0, 80), originalYouTubeUrl: String(this.originalYouTubeUrl || "").substring(0, 80), numConnections: this.numConnections, supportsRange: this.supportsRange, segmentCount: this.segments.length, ytDlEstimatedTotal: this.ytDlEstimatedTotal, filename: this.filename, ytDlTrackCountSeen: this.ytDlTrackCountSeen, ytDlStableTotalLocked: this.ytDlStableTotalLocked });
      // #endregion
    } catch (err: any) {
      if (this.useYoutubeDlDirect) {
        this.numConnections = 1;
        this.supportsRange = false;
        this.createSegments();
        return;
      }
      if (this.isSocialMedia && (err.message?.includes("media sosial") || this.socialExtractorFailed)) {
        this.status = "error";
        this.error = err.message;
        return;
      }
      console.warn("Initialization warning, falling back to single stream:", err.message);
      this.numConnections = 1;
      this.supportsRange = false;
      this.createSegments();
    }
  }

  private async probeTargetWrapper(targetUrl: string): Promise<void> {
    await probeTarget(
      {
        taskId: this.id, targetUrl, isYouTubeCdn: this.isYouTubeCdn,
        isSocialMedia: this.isSocialMedia, filename: this.filename,
        sanitizeFilename: (s) => this.sanitizeFilename(s),
      },
      {
        setTotalSize: (n) => (this.totalSize = n),
        setFilename: (s) => (this.filename = s),
        setSupportsRange: (b) => (this.supportsRange = b),
      }
    );
    if (!this.filename || this.filename.startsWith("download_")) {
      const fn = autoDetectFilenameFromUrl(targetUrl, (s) => this.sanitizeFilename(s));
      if (fn) this.filename = fn;
    }
  }

  private createSegments() {
    this.segments = createSegmentsList(
      this.totalSize, this.supportsRange, this.numConnections, this.tempDir, this.id
    );
  }

  start() {
    if (
      this.status === "downloading" ||
      this.status === "completed" ||
      this.status === "merging" ||
      this.status === "error"
    ) return;

    this.status = "downloading";
    this.error = undefined;
    this.isCancelled = false;
    this.startSpeedCalculation();

    if (this.useYoutubeDlDirect && this.originalYouTubeUrl) {
      this.startYtDlWrapper();
      return;
    }

    for (const segment of this.segments) {
      if (segment.status !== "completed") {
        this.runSegmentDownload(segment);
      }
    }
  }

  private startYtDlWrapper() {
    const ctx: YtDlHandlerCtx = {
      taskId: this.id,
      filename: this.filename,
      tempDir: this.tempDir,
      outputDir: this.outputDir,
      originalYouTubeUrl: this.originalYouTubeUrl,
      youtubeDlProcess: this.youtubeDlProcess,
      totalSize: this.totalSize,
      downloadedSize: this.downloadedSize,
      status: this.status,
      error: this.error,
      segments: this.segments,
      isCancelled: this.isCancelled,
      ytDlEstimatedTotal: this.ytDlEstimatedTotal,
      ytDlDownloadedAccum: this.ytDlDownloadedAccum,
      ytDlLastTrackDownloaded: this.ytDlLastTrackDownloaded,
      ytDlTrackCountSeen: this.ytDlTrackCountSeen,
      ytDlLastTrackPeak: this.ytDlLastTrackPeak,
      ytDlStableTotalLocked: this.ytDlStableTotalLocked,
      getStatus: () => this.status,
      setStatus: (s) => (this.status = s),
      setError: (s) => (this.error = s || undefined),
      setProcess: (p) => (this.youtubeDlProcess = p),
      setDownloadedSize: (n) => (this.downloadedSize = n),
      setTotalSize: (n) => (this.totalSize = n),
      setYtDlField: (field: keyof YtDlTrackState, value) => ((this as any)[field] = value),
      setSegment0: (updater) => {
        if (this.segments.length > 0) updater(this.segments[0]);
      },
      startSpeedCalculation: () => this.startSpeedCalculation(),
      stopSpeedCalculation: () => this.stopSpeedCalculation(),
    };
    startYoutubeDlDownload(ctx);
  }

  private runSegmentDownload(segment: Segment) {
    const ctx: DownloadSegmentCtx = {
      taskId: this.id,
      isYouTubeCdn: this.isYouTubeCdn,
      isSocialMedia: this.isSocialMedia,
      downloadUrl: this.downloadUrl,
      normalizeUrl: (u) => this.normalizeUrl(u),
      updateDownloadedSize: () => this.updateDownloadedSize(),
      checkCompletion: () => this.checkCompletion(),
      isCancelled: () => this.isCancelled,
      getStatus: () => this.status,
      setStatus: (s) => (this.status = s),
      stopSpeedCalculation: () => this.stopSpeedCalculation(),
      setError: (s) => (this.error = s),
      numConnections: this.numConnections,
      totalSize: this.totalSize,
      supportsRange: this.supportsRange,
      createSegments: () => {
        this.numConnections = 1;
        this.supportsRange = false;
        this.createSegments();
      },
      startDownload: () => this.start(),
    };
    downloadSegmentWithRetry(segment, ctx);
  }

  private updateDownloadedSize() {
    this.downloadedSize = this.segments.reduce((acc, seg) => acc + seg.downloaded, 0);
    if (this.totalSize === 0 && this.numConnections === 1) {
      this.totalSize = this.downloadedSize;
    }
  }

  private startSpeedCalculation() {
    if (this.speedInterval) clearInterval(this.speedInterval);
    this.lastDownloadedSize = this.downloadedSize;
    this.speedInterval = setInterval(() => {
      if (this.status === "downloading") {
        const delta = Math.max(0, this.downloadedSize - this.lastDownloadedSize);
        this.speed = delta;
        this.lastDownloadedSize = this.downloadedSize;
      } else {
        this.speed = 0;
      }
    }, 1000);
  }

  private stopSpeedCalculation() {
    if (this.speedInterval) {
      clearInterval(this.speedInterval);
      this.speedInterval = null;
    }
    this.speed = 0;
  }

  private checkCompletion() {
    if (this.segments.length > 0 && this.segments.every((seg) => seg.status === "completed")) {
      this.status = "merging";
      this.runMergeSegments();
    }
  }

  private runMergeSegments() {
    ffmpegMergeSegments(this.segments, {
      taskId: this.id,
      filename: this.filename,
      outputDir: this.outputDir,
      tempDir: this.tempDir,
      getCategory: () => this.getCategory(),
      setStatus: (s) => (this.status = s),
      setError: (s) => (this.error = s),
      setFinalSize: (n) => {
        this.downloadedSize = n;
        this.totalSize = n;
      },
      stopSpeedCalculation: () => this.stopSpeedCalculation(),
    });
  }

  pause() {
    if (this.status !== "downloading") return;
    this.status = "paused";
    this.stopSpeedCalculation();
    if (this.youtubeDlProcess) {
      try { this.youtubeDlProcess.kill("SIGKILL"); } catch (e) {}
      this.youtubeDlProcess = null;
    }
    for (const segment of this.segments) {
      if (segment.status === "downloading" && segment.cancelTokenSource) {
        try { segment.cancelTokenSource.cancel("Download paused by user"); } catch (e) {}
        segment.status = "paused";
      }
    }
  }

  resume() {
    if (this.status === "paused" || this.status === "error") {
      if (this.useYoutubeDlDirect) this.status = "pending";
      this.start();
    }
  }

  cancel() {
    this.isCancelled = true;
    if (this.youtubeDlProcess) {
      try { this.youtubeDlProcess.kill("SIGKILL"); } catch (e) {}
      this.youtubeDlProcess = null;
    }
    this.pause();
    try {
      if (fs.existsSync(this.tempDir)) fs.rmSync(this.tempDir, { recursive: true, force: true });
    } catch (e) {}
  }

  getCategory(): DownloadCategory {
    const ext = path.extname(this.filename).toLowerCase().replace(".", "");
    if (this.isSocialMedia) {
      if (["mp3", "wav", "flac", "aac", "ogg", "m4a", "opus"].includes(ext)) return "audio";
      return "video";
    }
    if (["mp4", "mkv", "webm", "avi", "mov", "flv", "wmv", "m4v", "3gp", "ts"].includes(ext)) return "video";
    if (["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "opus", "m4b"].includes(ext)) return "audio";
    if (["zip", "rar", "7z", "tar", "gz", "bz2", "iso", "xz", "tgz", "dmg"].includes(ext)) return "compressed";
    if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "epub", "csv", "json"].includes(ext)) return "document";
    if (["exe", "msi", "apk", "deb", "rpm", "appimage", "bin", "sh", "bat"].includes(ext)) return "program";
    return "other";
  }

  toJSON(): DownloadTaskJson {
    let displayTotal = this.totalSize;
    let displayDownloaded = this.downloadedSize;
    if (this.status === "completed" && displayDownloaded > 0) {
      displayTotal = displayDownloaded;
    }
    const remainingBytes = Math.max(0, displayTotal - displayDownloaded);
    const eta = this.speed > 0 && displayTotal > 0 ? Math.ceil(remainingBytes / this.speed) : null;
    let progress: number;
    if (this.status === "completed") progress = 100;
    else if (this.status === "merging") progress = 95;
    else if (displayTotal > 0) progress = Math.min(100, Math.max(0, (displayDownloaded / displayTotal) * 100));
    else progress = 0;

    const effectiveDownloaded = this.status === "completed"
      ? displayTotal
      : Math.min(displayDownloaded, displayTotal > 0 ? displayTotal : displayDownloaded);

    return {
      id: this.id,
      url: this.url,
      filename: this.filename,
      totalSize: displayTotal,
      downloadedSize: effectiveDownloaded,
      status: this.status,
      speed: this.speed,
      error: this.error,
      progress: Math.round(progress * 10) / 10,
      eta: eta,
      category: this.getCategory(),
      numConnections: this.numConnections,
      createdAt: this.createdAt,
      segments: this.segments.map((s) => {
        const segTotal = Math.max(1, s.end - s.start + 1);
        const segProgress = Math.min(100, Math.round((s.downloaded / segTotal) * 100));
        return {
          id: s.id, index: s.index, start: s.start, end: s.end,
          downloaded: s.downloaded, total: segTotal, status: s.status, progress: segProgress,
        };
      }),
    };
  }
}
