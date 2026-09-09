import axios from "axios";
import fs from "fs";
import path from "path";

import {
  Segment,
  DEFAULT_USER_AGENT,
  debugReport,
  MAX_SEGMENT_RETRIES,
} from "./task-types.js";

export function detectYouTubeCdn(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    return (
      host.includes("googlevideo.com") ||
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.endsWith(".google.com") ||
      u.searchParams.has("ratebypass") ||
      u.searchParams.has("signature") ||
      u.searchParams.has("sig") ||
      u.searchParams.has("xtags")
    );
  } catch {
    return false;
  }
}

export function buildStreamingHeaders(
  targetUrl: string,
  isYouTubeCdn: boolean,
  isSocialMedia: boolean
): Record<string, string> {
  const isYt = detectYouTubeCdn(targetUrl) || isYouTubeCdn || isSocialMedia;
  const headers: Record<string, string> = {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: "*/*",
  };
  if (isYt) {
    headers["Referer"] = "https://www.youtube.com/";
    headers["Origin"] = "https://www.youtube.com";
    headers["Accept-Language"] = "en-US,en;q=0.9";
    headers["Sec-Fetch-Mode"] = "no-cors";
    headers["Sec-Fetch-Site"] = "cross-site";
  }
  return headers;
}

export interface ProbeOptions {
  taskId: string;
  targetUrl: string;
  isYouTubeCdn: boolean;
  isSocialMedia: boolean;
  filename: string;
  sanitizeFilename: (name: string) => string;
}

export interface ProbeCallbacks {
  setTotalSize: (n: number) => void;
  setFilename: (s: string) => void;
  setSupportsRange: (b: boolean) => void;
}

export async function probeTarget(
  opts: ProbeOptions,
  cb: ProbeCallbacks
): Promise<void> {
  const { taskId, targetUrl, isYouTubeCdn: isYT, isSocialMedia, sanitizeFilename } = opts;
  const streamHeaders = buildStreamingHeaders(targetUrl, isYT, isSocialMedia);

  try {
    const res = await axios.head(targetUrl, {
      headers: streamHeaders,
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const ct = String(res.headers["content-type"] || "").toLowerCase();
    if (isSocialMedia && ct.includes("text/html")) {
      throw new Error(
        "Gagal mengekstrak video media sosial: Tautan mengarah ke halaman web login/HTML dan bukan berkas video langsung."
      );
    }

    const cl = res.headers["content-length"];
    if (cl) cb.setTotalSize(parseInt(String(cl), 10) || 0);
    const ar = res.headers["accept-ranges"];
    cb.setSupportsRange(ar === "bytes");

    const fn = extractFilenameFromHeaders(res.headers, sanitizeFilename);
    if (fn) cb.setFilename(fn);
    debugReport("B", "direct-http-downloader.ts:probeTarget", "[DEBUG] HEAD probe succeeded", {
      taskId, targetUrl, status: res.status, contentType: ct, contentLength: cl,
    });
  } catch (headErr: any) {
    if (headErr.message?.includes("media sosial")) throw headErr;
    try {
      const rangeHeaders = { ...streamHeaders, Range: "bytes=0-0" };
      const getRes = await axios.get(targetUrl, {
        headers: rangeHeaders, timeout: 10000, maxRedirects: 5,
        responseType: "stream", validateStatus: (s) => s >= 200 && s < 400,
      });
      if (getRes.data && typeof getRes.data.destroy === "function") {
        getRes.data.destroy();
      }
      const getCt = String(getRes.headers["content-type"] || "").toLowerCase();
      if (isSocialMedia && getCt.includes("text/html")) {
        throw new Error("Gagal mengekstrak video media sosial: HTML bukan video.");
      }
      const cr = getRes.headers["content-range"];
      if (cr) {
        const match = cr.match(/\/(\d+)/);
        if (match && match[1]) {
          cb.setTotalSize(parseInt(match[1], 10) || 0);
          cb.setSupportsRange(true);
        }
      } else if (getRes.headers["content-length"]) {
        cb.setTotalSize(parseInt(String(getRes.headers["content-length"]), 10) || 0);
      }
      const fn2 = extractFilenameFromHeaders(getRes.headers, sanitizeFilename);
      if (fn2) cb.setFilename(fn2);
    } catch (getErr: any) {
      if (getErr.message?.includes("media sosial")) throw getErr;
      console.warn("Probe GET also failed, will stream blind:", getErr.message);
    }
  }
}

export function extractFilenameFromHeaders(
  headers: any,
  sanitizeFilename: (s: string) => string
): string | null {
  const cd = headers["content-disposition"] as string | undefined;
  if (cd) {
    const utfMatch = cd.match(/filename\*=UTF-8''([^;\r\n]+)/i);
    if (utfMatch && utfMatch[1]) return sanitizeFilename(decodeURIComponent(utfMatch[1]));
    const normalMatch = cd.match(/filename="?([^";\r\n]+)"?/i);
    if (normalMatch && normalMatch[1]) return sanitizeFilename(normalMatch[1]);
  }
  return null;
}

export function autoDetectFilenameFromUrl(
  targetUrl: string,
  sanitizeFilename: (s: string) => string
): string | null {
  try {
    const urlObj = new URL(targetUrl);
    const pathPart = path.basename(urlObj.pathname);
    if (pathPart && pathPart.includes(".")) {
      return sanitizeFilename(decodeURIComponent(pathPart));
    }
  } catch {}
  return null;
}

export interface DownloadSegmentCtx {
  taskId: string;
  isYouTubeCdn: boolean;
  isSocialMedia: boolean;
  downloadUrl: string;
  normalizeUrl: (u: string) => string;
  updateDownloadedSize: () => void;
  checkCompletion: () => void;
  isCancelled: () => boolean;
  getStatus: () => string;
  setStatus: (s: any) => void;
  stopSpeedCalculation: () => void;
  setError: (s: string) => void;
  numConnections: number;
  totalSize: number;
  supportsRange: boolean;
  createSegments: () => void;
  startDownload: () => void;
}

export function createSegmentsList(
  totalSize: number,
  supportsRange: boolean,
  numConnections: number,
  tempDir: string,
  taskId: string
): Segment[] {
  const segments: Segment[] = [];
  if (totalSize > 0 && supportsRange && numConnections > 1) {
    const segmentSize = Math.ceil(totalSize / numConnections);
    for (let i = 0; i < numConnections; i++) {
      const start = i * segmentSize;
      const end = Math.min((i + 1) * segmentSize - 1, totalSize - 1);
      if (start <= end) {
        segments.push({
          id: `${taskId}_${i}`,
          index: i + 1,
          start,
          end,
          downloaded: 0,
          status: "pending",
          file: path.join(tempDir, `segment_${i}`),
          retryCount: 0,
        });
      }
    }
  } else {
    segments.push({
      id: `${taskId}_0`,
      index: 1,
      start: 0,
      end: totalSize > 0 ? totalSize - 1 : 0,
      downloaded: 0,
      status: "pending",
      file: path.join(tempDir, `segment_0`),
      retryCount: 0,
    });
  }
  return segments;
}

export async function downloadSegmentWithRetry(
  segment: Segment,
  ctx: DownloadSegmentCtx
): Promise<void> {
  const targetUrl = ctx.normalizeUrl(ctx.downloadUrl || "");
  while (
    segment.retryCount <= MAX_SEGMENT_RETRIES &&
    !ctx.isCancelled() &&
    ctx.getStatus() === "downloading"
  ) {
    try {
      await downloadSegmentInternal(segment, targetUrl, ctx);
      return;
    } catch (err: any) {
      if (axios.isCancel(err) || ctx.isCancelled() || ctx.getStatus() === "paused") {
        segment.status = "paused";
        return;
      }
      segment.retryCount++;
      console.warn(
        `[Task ${ctx.taskId}] Segment ${segment.index} error: ${err.message}. Retry ${segment.retryCount}/${MAX_SEGMENT_RETRIES}`
      );
      if (segment.retryCount > MAX_SEGMENT_RETRIES) {
        debugReport("E", "direct-http-downloader.ts:downloadSegmentWithRetry", "[DEBUG] Max retries", {
          taskId: ctx.taskId, segmentIndex: segment.index,
        });
        if (
          ctx.numConnections > 1 &&
          (err.response?.status === 416 || err.message.includes("416"))
        ) {
          console.warn(
            `[Task ${ctx.taskId}] Server rejected Range. Falling back to single-stream.`
          );
          ctx.createSegments();
          ctx.startDownload();
          return;
        }
        segment.status = "error";
        ctx.setStatus("error");
        ctx.setError(`Connection error on thread #${segment.index}: ${err.message}`);
        ctx.stopSpeedCalculation();
        return;
      }
      const delay = Math.min(3000, 500 * Math.pow(2, segment.retryCount - 1));
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function downloadSegmentInternal(
  segment: Segment,
  targetUrl: string,
  ctx: DownloadSegmentCtx
): Promise<void> {
  segment.status = "downloading";
  const CancelToken = axios.CancelToken;
  segment.cancelTokenSource = CancelToken.source();

  const headers = buildStreamingHeaders(targetUrl, ctx.isYouTubeCdn, ctx.isSocialMedia);

  if (ctx.totalSize > 0 && ctx.numConnections > 1 && ctx.supportsRange) {
    const currentStart = segment.start + segment.downloaded;
    if (currentStart > segment.end) {
      segment.status = "completed";
      ctx.checkCompletion();
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
    timeout: ctx.isYouTubeCdn || ctx.isSocialMedia ? 60000 : 15000,
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400,
  });

  const isAppend = segment.downloaded > 0;
  const writeStream = fs.createWriteStream(segment.file, { flags: isAppend ? "a" : "w" });

  response.data.on("data", (chunk: Buffer) => {
    segment.downloaded += chunk.length;
    ctx.updateDownloadedSize();
  });

  response.data.pipe(writeStream);

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", () => resolve());
    writeStream.on("error", (e) => reject(e));
    response.data.on("error", (e: any) => {
      writeStream.destroy();
      reject(e);
    });
  });

  segment.status = "completed";
  ctx.checkCompletion();
}
