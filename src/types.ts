export type DownloadStatus = "pending" | "downloading" | "paused" | "merging" | "completed" | "error";

export type CategoryType = "all" | "downloading" | "completed" | "paused" | "video" | "audio" | "compressed" | "document" | "program" | "other";

export interface SegmentInfo {
  id: string;
  index: number;
  start: number;
  end: number;
  downloaded: number;
  total: number;
  status: "pending" | "downloading" | "completed" | "error" | "paused";
  progress: number;
}

export interface DownloadTask {
  id: string;
  url: string;
  filename: string;
  totalSize: number;
  downloadedSize: number;
  status: DownloadStatus;
  speed: number;
  error?: string;
  progress: number;
  eta?: number | null;
  category: "video" | "audio" | "compressed" | "document" | "program" | "other";
  numConnections: number;
  createdAt: number;
  segments?: SegmentInfo[];
}

export interface AnalyzeFormat {
  id: string;
  quality: string;
  format: string;
  size: number;
  url: string;
  supportsRange: boolean;
  title?: string;
}

export interface SystemStats {
  totalTasks: number;
  activeCount: number;
  completedCount: number;
  pausedCount: number;
  totalSpeed: number;
}
