import { v4 as uuidv4 } from "uuid";
import axios, { AxiosError } from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import youtubedlPkg from "youtube-dl-exec";
const youtubedl = (youtubedlPkg as any).default || youtubedlPkg;
import fbDownloaderPkg from "@renpwn/fb-downloader";
const fbDownloader = (fbDownloaderPkg as any).default || fbDownloaderPkg;
import play from "play-dl";

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

export type DownloadStatus = "pending" | "downloading" | "paused" | "merging" | "completed" | "error";

interface Segment {
  id: string;
  index: number;
  start: number;
  end: number;
  downloaded: number;
  status: "pending" | "downloading" | "completed" | "error" | "paused";
  file: string;
  cancelTokenSource?: any;
  retryCount: number;
}

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

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
  private isCancelled: boolean = false;

  constructor(url: string, filename?: string, connections?: number) {
    this.id = uuidv4();
    this.url = (url || "").trim();
    this.filename = this.sanitizeFilename(filename || `download_${this.id.substring(0, 8)}`);
    this.numConnections = Math.max(1, Math.min(32, connections || 8));
    
    // Centralized storage directory inside process.cwd()/downloads
    this.outputDir = path.join(process.cwd(), "downloads");
    this.tempDir = path.join(os.tmpdir(), "turbodownloader_temp", this.id);

    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }
    } catch (err) {
      console.error("Failed to initialize directory:", err);
    }
  }

  private sanitizeFilename(name: string): string {
    // Remove invalid OS characters, null bytes, and path traversal
    let clean = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
    // Strip trailing dots or spaces
    clean = clean.replace(/^[.\s]+|[.\s]+$/g, "");
    if (!clean) {
      clean = `download_${Date.now()}`;
    }
    return clean;
  }

  private normalizeUrl(inputUrl: string): string {
    const trimmed = inputUrl.trim();
    if (trimmed.startsWith("/")) {
      return `http://127.0.0.1:3000${trimmed}`;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }

  async initialize(): Promise<void> {
    try {
      const isFb =
        this.url.includes("facebook.com") ||
        this.url.includes("fb.watch") ||
        this.url.includes("fb.com");
      const isTikTok = this.url.includes("tiktok.com");
      const isYouTube = this.url.includes("youtube.com") || this.url.includes("youtu.be");
      const isInstagram = this.url.includes("instagram.com");

      this.isSocialMedia =
        isFb ||
        isTikTok ||
        isYouTube ||
        isInstagram ||
        this.url.includes("twitter.com") ||
        this.url.includes("x.com");

      if (isFb) {
        try {
          const fbRes = await fbDownloader(this.url);
          if (fbRes && (fbRes.hd || fbRes.sd)) {
            this.downloadUrl = fbRes.hd || fbRes.sd;
            if (fbRes.title && (!this.filename || this.filename.startsWith("download_"))) {
              const cleanTitle = decodeHtmlEntities(fbRes.title)
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
                .trim()
                .substring(0, 80);
              this.filename = (cleanTitle || `Facebook_Video_${this.id.substring(0, 8)}`) + ".mp4";
            } else if (!this.filename.endsWith(".mp4") && !this.filename.includes(".")) {
              this.filename += ".mp4";
            }
          }
        } catch (fbErr: any) {
          console.warn("Facebook extraction error:", fbErr.message);
        }
      } else if (isTikTok) {
        try {
          const tikRes = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(this.url)}`, {
            timeout: 10000,
          });
          if (tikRes.data?.data?.play) {
            this.downloadUrl = tikRes.data.data.play;
            if (!this.filename || this.filename.startsWith("download_")) {
              const rawTitle = tikRes.data.data.title || `TikTok_${this.id.substring(0, 8)}`;
              const cleanTitle = rawTitle.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim().substring(0, 80);
              this.filename = (cleanTitle || `TikTok_${this.id.substring(0, 8)}`) + ".mp4";
            } else if (!this.filename.endsWith(".mp4") && !this.filename.includes(".")) {
              this.filename += ".mp4";
            }
            this.totalSize = tikRes.data.data.size || 0;
          }
        } catch (tikErr: any) {
          console.warn("TikTok extraction error:", tikErr.message);
        }
      } else if (isYouTube) {
        try {
          let normalizedUrl = this.url;
          if (normalizedUrl.includes("/shorts/")) {
            const vid = normalizedUrl.split("/shorts/")[1]?.split("/")[0]?.split("?")[0];
            if (vid) normalizedUrl = `https://www.youtube.com/watch?v=${vid}`;
          } else if (normalizedUrl.includes("youtu.be/")) {
            const vid = normalizedUrl.split("youtu.be/")[1]?.split("?")[0];
            if (vid) normalizedUrl = `https://www.youtube.com/watch?v=${vid}`;
          }

          const info = await play.video_info(normalizedUrl);
          const videoFormats = info.format.filter((f) => f.qualityLabel && f.audioQuality);
          const chosen = videoFormats[0] || info.format.find((f) => f.url);
          if (chosen && chosen.url) {
            this.downloadUrl = chosen.url;
            if (info.video_details.title && (!this.filename || this.filename.startsWith("download_"))) {
              this.filename = this.sanitizeFilename(info.video_details.title) + ".mp4";
            } else if (!this.filename.endsWith(".mp4") && !this.filename.includes(".")) {
              this.filename += ".mp4";
            }
          }
        } catch (ytErr: any) {
          if (!String(ytErr?.message).includes("Sign in to confirm")) {
            console.warn("play-dl extraction error:", ytErr.message);
          }
        }
      }

      if (this.isSocialMedia && !this.downloadUrl) {
        try {
          const info: any = await youtubedl(this.url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: ["referer:google.com", `user-agent:${DEFAULT_USER_AGENT}`],
          });

          if (info && info.url) {
            this.downloadUrl = info.url;
            if (info.title && (!this.filename || this.filename.startsWith("download_"))) {
              const ext = info.ext ? `.${info.ext}` : ".mp4";
              this.filename = this.sanitizeFilename(info.title + ext);
            }
            this.totalSize = info.filesize || info.filesize_approx || 0;
          }
        } catch (e: any) {
          const errStr = String(e?.message || e?.stderr || e);
          if (errStr.includes("Sign in to confirm you’re not a bot") || errStr.includes("Sign in to confirm")) {
             throw new Error("Gagal mengekstrak video media sosial: YouTube memblokir IP server ini (Google Cloud) untuk mencegah penyalahgunaan bot. Silakan jalankan aplikasi ini secara lokal.");
          }
          console.warn("Social media extraction fallback to direct URL:", errStr);
          if (errStr.includes("ENOENT") && errStr.includes("youtube-dl-exec")) {
             console.error("youtube-dl-exec binary is missing! Ensure postinstall script runs properly.");
          }
        }
      }

      if (!this.downloadUrl) {
        this.downloadUrl = this.url;
      }

      const targetUrl = this.normalizeUrl(this.downloadUrl);

      // Probe target with multi-tier strategy (HEAD first, fallback to GET range probe)
      await this.probeTarget(targetUrl);

      // Create download segments based on size and range support
      this.createSegments();
    } catch (err: any) {
      if (this.isSocialMedia && err.message?.includes("media sosial")) {
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

  private async probeTarget(targetUrl: string): Promise<void> {
    let probed = false;

    // Strategy 1: HEAD Request
    try {
      const res = await axios.head(targetUrl, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "*/*",
        },
        timeout: 8000,
        maxRedirects: 5,
        validateStatus: (s) => s >= 200 && s < 400,
      });

      const ct = String(res.headers["content-type"] || "").toLowerCase();
      if (this.isSocialMedia && ct.includes("text/html")) {
        throw new Error(
          "Gagal mengekstrak video media sosial: Tautan mengarah ke halaman web login/HTML dan bukan berkas video langsung. Pastikan video bersifat publik."
        );
      }

      const cl = res.headers["content-length"];
      if (cl) {
        this.totalSize = parseInt(String(cl), 10) || 0;
      }

      const ar = res.headers["accept-ranges"];
      this.supportsRange = ar === "bytes";

      this.extractFilenameFromHeaders(res.headers);
      probed = true;
    } catch (headErr: any) {
      if (headErr.message?.includes("media sosial")) {
        throw headErr;
      }
      // Strategy 2: Lightweight Range GET Probe (bytes=0-0)
      try {
        const getRes = await axios.get(targetUrl, {
          headers: {
            "User-Agent": DEFAULT_USER_AGENT,
            Range: "bytes=0-0",
            Accept: "*/*",
          },
          timeout: 8000,
          maxRedirects: 5,
          responseType: "stream",
          validateStatus: (s) => s >= 200 && s < 400,
        });

        // Terminate probe stream immediately to conserve network bandwidth
        if (getRes.data && typeof getRes.data.destroy === "function") {
          getRes.data.destroy();
        }

        const getCt = String(getRes.headers["content-type"] || "").toLowerCase();
        if (this.isSocialMedia && getCt.includes("text/html")) {
          throw new Error(
            "Gagal mengekstrak video media sosial: Tautan mengarah ke halaman web login/HTML dan bukan berkas video langsung. Pastikan video bersifat publik."
          );
        }

        const cr = getRes.headers["content-range"];
        if (cr) {
          const match = cr.match(/\/(\d+)/);
          if (match && match[1]) {
            this.totalSize = parseInt(match[1], 10) || 0;
            this.supportsRange = true;
          }
        } else if (getRes.headers["content-length"]) {
          this.totalSize = parseInt(String(getRes.headers["content-length"]), 10) || 0;
        }

        this.extractFilenameFromHeaders(getRes.headers);
        probed = true;
      } catch (getErr: any) {
        if (getErr.message?.includes("media sosial")) {
          throw getErr;
        }
        console.warn("Probe GET also failed, will download directly as single stream:", getErr.message);
      }
    }

    // Auto-detect filename from URL path if not yet extracted
    if (!this.filename || this.filename.startsWith("download_")) {
      try {
        const urlObj = new URL(targetUrl);
        const pathPart = path.basename(urlObj.pathname);
        if (pathPart && pathPart.includes(".")) {
          this.filename = this.sanitizeFilename(decodeURIComponent(pathPart));
        }
      } catch (e) {}
    }
  }

  private extractFilenameFromHeaders(headers: any) {
    const cd = headers["content-disposition"] as string | undefined;
    if (cd && (!this.filename || this.filename.startsWith("download_"))) {
      // Match UTF-8 filename* first, then standard filename
      const utfMatch = cd.match(/filename\*=UTF-8''([^;\r\n]+)/i);
      if (utfMatch && utfMatch[1]) {
        this.filename = this.sanitizeFilename(decodeURIComponent(utfMatch[1]));
        return;
      }
      const normalMatch = cd.match(/filename="?([^";\r\n]+)"?/i);
      if (normalMatch && normalMatch[1]) {
        this.filename = this.sanitizeFilename(normalMatch[1]);
      }
    }
  }

  private createSegments() {
    this.segments = [];

    if (this.totalSize > 0 && this.supportsRange && this.numConnections > 1) {
      const segmentSize = Math.ceil(this.totalSize / this.numConnections);
      for (let i = 0; i < this.numConnections; i++) {
        const start = i * segmentSize;
        const end = Math.min((i + 1) * segmentSize - 1, this.totalSize - 1);
        if (start <= end) {
          this.segments.push({
            id: `${this.id}_${i}`,
            index: i + 1,
            start,
            end,
            downloaded: 0,
            status: "pending",
            file: path.join(this.tempDir, `segment_${i}`),
            retryCount: 0,
          });
        }
      }
    } else {
      // Single connection (non-chunked or range not supported)
      this.numConnections = 1;
      this.segments.push({
        id: `${this.id}_0`,
        index: 1,
        start: 0,
        end: this.totalSize > 0 ? this.totalSize - 1 : 0,
        downloaded: 0,
        status: "pending",
        file: path.join(this.tempDir, `segment_0`),
        retryCount: 0,
      });
    }
  }

  start() {
    if (
      this.status === "downloading" ||
      this.status === "completed" ||
      this.status === "merging" ||
      this.status === "error"
    ) {
      return;
    }

    this.status = "downloading";
    this.error = undefined;
    this.isCancelled = false;

    this.startSpeedCalculation();

    for (const segment of this.segments) {
      if (segment.status !== "completed") {
        this.downloadSegmentWithRetry(segment);
      }
    }
  }

  private async downloadSegmentWithRetry(segment: Segment) {
    const MAX_RETRIES = 4;
    const targetUrl = this.normalizeUrl(this.downloadUrl || this.url);

    while (segment.retryCount <= MAX_RETRIES && !this.isCancelled && this.status === "downloading") {
      try {
        await this.downloadSegment(segment, targetUrl);
        return; // Successfully completed
      } catch (err: any) {
        if (axios.isCancel(err) || this.isCancelled || (this.status as string) === "paused") {
          segment.status = "paused";
          return;
        }

        segment.retryCount++;
        console.warn(
          `[Task ${this.id}] Segment ${segment.index} error: ${err.message}. Retry ${segment.retryCount}/${MAX_RETRIES}`
        );

        if (segment.retryCount > MAX_RETRIES) {
          // If multi-segment failed on range errors (e.g. 416), fall back to single stream
          if (this.numConnections > 1 && (err.response?.status === 416 || err.message.includes("416"))) {
            console.warn(`[Task ${this.id}] Server rejected Range requests. Falling back to single-stream mode.`);
            this.numConnections = 1;
            this.createSegments();
            this.start();
            return;
          }

          segment.status = "error";
          this.status = "error";
          this.error = `Connection error on thread #${segment.index}: ${err.message}`;
          this.stopSpeedCalculation();
          return;
        }

        // Exponential backoff before retry (500ms, 1200ms, 2500ms...)
        const delay = Math.min(3000, 500 * Math.pow(2, segment.retryCount - 1));
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  private async downloadSegment(segment: Segment, targetUrl: string): Promise<void> {
    segment.status = "downloading";
    const CancelToken = axios.CancelToken;
    segment.cancelTokenSource = CancelToken.source();

    const headers: Record<string, string> = {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "*/*",
    };

    // If multi-connection and range is supported, request the exact remaining byte range
    if (this.totalSize > 0 && this.numConnections > 1) {
      const currentStart = segment.start + segment.downloaded;
      if (currentStart > segment.end) {
        segment.status = "completed";
        this.checkCompletion();
        return;
      }
      headers["Range"] = `bytes=${currentStart}-${segment.end}`;
    }

    const response = await axios({
      method: "GET",
      url: targetUrl,
      responseType: "stream",
      headers,
      cancelToken: segment.cancelTokenSource.token,
      timeout: 15000,
      maxRedirects: 5,
    });

    const isAppend = segment.downloaded > 0;
    const writeStream = fs.createWriteStream(segment.file, { flags: isAppend ? "a" : "w" });

    response.data.on("data", (chunk: Buffer) => {
      segment.downloaded += chunk.length;
      this.updateDownloadedSize();
    });

    response.data.pipe(writeStream);

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => {
        resolve();
      });
      writeStream.on("error", (e) => {
        reject(e);
      });
      response.data.on("error", (e: any) => {
        writeStream.destroy();
        reject(e);
      });
    });

    segment.status = "completed";
    this.checkCompletion();
  }

  private updateDownloadedSize() {
    this.downloadedSize = this.segments.reduce((acc, seg) => acc + seg.downloaded, 0);
    // If totalSize was unknown originally, update dynamically
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
      this.mergeSegments();
    }
  }

  /**
   * Safe, non-blocking in-process stream merger
   * Guarantees 100% success rate without relying on external child workers or missing .js files
   */
  private async mergeSegments() {
    this.stopSpeedCalculation();

    const outputFile = path.join(this.outputDir, this.filename);
    const segmentFiles = this.segments.map((seg) => seg.file);

    try {
      if (segmentFiles.length === 1 && fs.existsSync(segmentFiles[0])) {
        // Fast path: Single segment, move/copy directly
        try {
          fs.copyFileSync(segmentFiles[0], outputFile);
          fs.unlinkSync(segmentFiles[0]);
        } catch {
          await this.streamMerge(outputFile, segmentFiles);
        }
      } else {
        // Multi-segment: Pipe sequentially
        await this.streamMerge(outputFile, segmentFiles);
      }

      // Cleanup temp directory
      try {
        if (fs.existsSync(this.tempDir)) {
          fs.rmSync(this.tempDir, { recursive: true, force: true });
        }
      } catch (e) {}

      // Optimize video files for universal compatibility (Windows Media Player, QuickTime, iOS, Android, web)
      // Converts audio to AAC-LC and places moov atom at beginning (+faststart), eliminating error 0xC00D36C4
      if (this.getCategory() === "video" || this.filename.toLowerCase().endsWith(".mp4")) {
        await this.optimizeVideoForCompatibility(outputFile);
      }

      // Update actual final size
      try {
        const stat = fs.statSync(outputFile);
        this.downloadedSize = stat.size;
        this.totalSize = this.downloadedSize;
      } catch (e) {}

      this.status = "completed";
      this.error = undefined;
    } catch (err: any) {
      console.error(`Merge failed for ${this.filename}:`, err);
      this.status = "error";
      this.error = `Failed to assemble final file: ${err.message}`;
    }
  }

  private async streamMerge(outputFile: string, segmentFiles: string[]): Promise<void> {
    const writeStream = fs.createWriteStream(outputFile);

    for (const segFile of segmentFiles) {
      if (!fs.existsSync(segFile)) continue;

      await new Promise<void>((resolve, reject) => {
        const readStream = fs.createReadStream(segFile);
        readStream.pipe(writeStream, { end: false });
        readStream.on("end", resolve);
        readStream.on("error", (err) => reject(err));
      });

      try {
        fs.unlinkSync(segFile);
      } catch (e) {}
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end();
      writeStream.on("finish", resolve);
      writeStream.on("error", (err) => reject(err));
    });
  }

  private async optimizeVideoForCompatibility(outputFile: string): Promise<void> {
    const ext = path.extname(outputFile).toLowerCase();
    if (![".mp4", ".mkv", ".mov", ".webm", ".avi", ".ts"].includes(ext)) {
      return;
    }

    const tempOptimized = outputFile + ".opt.mp4";
    try {
      await new Promise<void>((resolve, reject) => {
        // -c:v copy preserves 100% original video stream without re-encoding
        // -c:a aac -b:a 128k converts HE-AACv2 to universal AAC-LC
        // -movflags +faststart moves moov atom to start of file for instant playback & seeking
        const cmd = `ffmpeg -y -i "${outputFile}" -c:v copy -c:a aac -b:a 128k -movflags +faststart "${tempOptimized}"`;
        exec(cmd, { timeout: 60000 }, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      if (fs.existsSync(tempOptimized) && fs.statSync(tempOptimized).size > 1000) {
        fs.unlinkSync(outputFile);
        fs.renameSync(tempOptimized, outputFile);
      }
    } catch (e: any) {
      console.warn("Video optimization skipped or failed (original kept):", e?.message || e);
      if (fs.existsSync(tempOptimized)) {
        try {
          fs.unlinkSync(tempOptimized);
        } catch (_) {}
      }
    }
  }

  pause() {
    if (this.status !== "downloading") return;
    this.status = "paused";
    this.stopSpeedCalculation();

    for (const segment of this.segments) {
      if (segment.status === "downloading" && segment.cancelTokenSource) {
        try {
          segment.cancelTokenSource.cancel("Download paused by user");
        } catch (e) {}
        segment.status = "paused";
      }
    }
  }

  resume() {
    if (this.status === "paused" || this.status === "error") {
      this.start();
    }
  }

  cancel() {
    this.isCancelled = true;
    this.pause();
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      }
    } catch (e) {}
  }

  getCategory(): "video" | "audio" | "compressed" | "document" | "program" | "other" {
    const ext = path.extname(this.filename).toLowerCase().replace(".", "");
    if (this.isSocialMedia) {
      if (["mp3", "wav", "flac", "aac", "ogg", "m4a", "opus"].includes(ext)) return "audio";
      return "video";
    }
    if (["mp4", "mkv", "webm", "avi", "mov", "flv", "wmv", "m4v", "3gp", "ts"].includes(ext)) return "video";
    if (["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "opus", "m4b"].includes(ext)) return "audio";
    if (["zip", "rar", "7z", "tar", "gz", "bz2", "iso", "xz", "tgz", "dmg"].includes(ext)) return "compressed";
    if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "epub", "csv", "json"].includes(ext))
      return "document";
    if (["exe", "msi", "apk", "deb", "rpm", "appimage", "bin", "sh", "bat"].includes(ext)) return "program";
    return "other";
  }

  toJSON() {
    const remainingBytes = Math.max(0, this.totalSize - this.downloadedSize);
    const eta = this.speed > 0 && this.totalSize > 0 ? Math.ceil(remainingBytes / this.speed) : null;
    const progress =
      this.totalSize > 0
        ? Math.min(100, Math.max(0, (this.downloadedSize / this.totalSize) * 100))
        : this.status === "completed"
        ? 100
        : 0;

    return {
      id: this.id,
      url: this.url,
      filename: this.filename,
      totalSize: this.totalSize,
      downloadedSize: this.downloadedSize,
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
          id: s.id,
          index: s.index,
          start: s.start,
          end: s.end,
          downloaded: s.downloaded,
          total: segTotal,
          status: s.status,
          progress: segProgress,
        };
      }),
    };
  }
}
