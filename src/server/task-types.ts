export type DownloadStatus = "pending" | "downloading" | "paused" | "merging" | "completed" | "error";

export interface Segment {
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

export interface SegmentJson {
  id: string;
  index: number;
  start: number;
  end: number;
  downloaded: number;
  total: number;
  status: string;
  progress: number;
}

export interface DownloadTaskJson {
  id: string;
  url: string;
  filename: string;
  totalSize: number;
  downloadedSize: number;
  status: DownloadStatus;
  speed: number;
  error?: string;
  progress: number;
  eta: number | null;
  category: string;
  numConnections: number;
  createdAt: number;
  segments: SegmentJson[];
}

export type DownloadCategory = "video" | "audio" | "compressed" | "document" | "program" | "other";

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const MAX_SEGMENT_RETRIES = 4;

export function decodeHtmlEntities(str: string): string {
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

export function debugReport(
  hypothesisId: string,
  location: string,
  msg: string,
  dataIn: Record<string, unknown> = {}
) {
  try {
    const { __dbgEnv, ...data } = dataIn as any;
    const envName = typeof __dbgEnv === "string" && __dbgEnv ? __dbgEnv : "youtube-0bytes-failed";
    const envPath = path_join(process.cwd(), ".dbg", `${envName}.env`);
    let endpoint = "http://127.0.0.1:7777/event";
    let sessionId = "youtube-0bytes-failed";
    if (fs_existsSync(envPath)) {
      const envText = fs_readFileSync(envPath, "utf8");
      endpoint =
        envText.match(/^DEBUG_SERVER_URL=(.+)$/m)?.[1]?.trim() ||
        endpoint;
      sessionId =
        envText.match(/^DEBUG_SESSION_ID=(.+)$/m)?.[1]?.trim() ||
        sessionId;
    }
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        runId: "pre-fix",
        hypothesisId,
        location,
        msg,
        data,
        ts: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
}

export function dbgReport(
  hypothesisId: string,
  location: string,
  msg: string,
  data: Record<string, unknown> = {},
  envBasename = "youtube-0bytes-failed"
) {
  debugReport(hypothesisId, location, msg, {
    ...data,
    __dbgEnv: envBasename,
  });
}

import fs from "fs";
import path from "path";
const fs_existsSync = fs.existsSync;
const fs_readFileSync = fs.readFileSync;
const path_join = path.join;
