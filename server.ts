import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import play from "play-dl";
import youtubedlPkg from "youtube-dl-exec";
const youtubedl = (youtubedlPkg as any).default || youtubedlPkg;
import fbDownloaderPkg from "@renpwn/fb-downloader";
const fbDownloader = (fbDownloaderPkg as any).default || fbDownloaderPkg;
import { downloadManager } from "./src/server/DownloadManager.js";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = 3000;

app.use(express.json());

// WebSocket connection handling
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "INIT", data: downloadManager.getAll() }));
});

function broadcast(message: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Periodically broadcast updates for active downloads
setInterval(() => {
  const activeDownloads = downloadManager.getAll().filter((d: any) => d.status === "downloading" || d.status === "merging");
  if (activeDownloads.length > 0) {
    broadcast({ type: "UPDATE_ALL", data: downloadManager.getAll() });
  }
}, 1000);

// API Routes
app.post("/api/analyze", async (req, res) => {
  const { url } = req.body;
  
  try {
    // Check if it's a Facebook URL
    if (url.includes("facebook.com") || url.includes("fb.watch") || url.includes("fb.com")) {
      try {
        const fbRes = await fbDownloader(url);
        if (fbRes && (fbRes.hd || fbRes.sd)) {
          const formats = [];
          const rawTitle = fbRes.title ? decodeHtmlEntities(fbRes.title) : "Facebook_Video";
          const cleanTitle = rawTitle.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim().substring(0, 80);

          if (fbRes.hd) {
            let hdSize = 0;
            try {
              const headCheck = await axios.head(fbRes.hd, { timeout: 4000 });
              if (headCheck.headers["content-length"]) {
                hdSize = parseInt(String(headCheck.headers["content-length"]), 10) || 0;
              }
            } catch (e) {}

            formats.push({
              id: "fb-hd",
              quality: "HD Quality (High Definition)",
              format: "video/mp4",
              size: hdSize,
              url: fbRes.hd,
              supportsRange: true,
              title: cleanTitle
            });
          }

          if (fbRes.sd) {
            let sdSize = 0;
            try {
              const headCheck = await axios.head(fbRes.sd, { timeout: 4000 });
              if (headCheck.headers["content-length"]) {
                sdSize = parseInt(String(headCheck.headers["content-length"]), 10) || 0;
              }
            } catch (e) {}

            formats.push({
              id: "fb-sd",
              quality: "SD Quality (Standard)",
              format: "video/mp4",
              size: sdSize,
              url: fbRes.sd,
              supportsRange: true,
              title: cleanTitle
            });
          }

          return res.json({ formats });
        }
      } catch (fbErr: any) {
        console.error("Facebook analyze error:", fbErr.message);
      }
    }

    // Check if it's a TikTok URL (No Watermark Extraction)
    if (url.includes("tiktok.com")) {
      try {
        const tikRes = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
        if (tikRes.data && tikRes.data.data && tikRes.data.data.play) {
          const videoData = tikRes.data.data;
          const formats = [{
            id: "tiktok-nowm",
            quality: "No Watermark (HD)",
            format: "video/mp4",
            size: videoData.size || 0,
            url: videoData.play,
            supportsRange: true,
            title: (videoData.title || "TikTok_Video").substring(0, 50)
          }];
          return res.json({ formats });
        }
      } catch (e) {
        console.error("TikTok API error", e);
      }
    }

    // Check if it's a YouTube URL
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      try {
        let normalizedUrl = url;
        if (normalizedUrl.includes("/shorts/")) {
          const vid = normalizedUrl.split("/shorts/")[1]?.split("/")[0]?.split("?")[0];
          if (vid) normalizedUrl = `https://www.youtube.com/watch?v=${vid}`;
        } else if (normalizedUrl.includes("youtu.be/")) {
          const vid = normalizedUrl.split("youtu.be/")[1]?.split("?")[0];
          if (vid) normalizedUrl = `https://www.youtube.com/watch?v=${vid}`;
        }

        const info = await play.video_info(normalizedUrl);
        let videoFormats = info.format.filter((f) => f.qualityLabel && f.audioQuality);
        
        if (videoFormats.length === 0) {
          const videoOnly = info.format.filter((f) => f.qualityLabel);
          if (videoOnly.length > 0) {
            videoFormats.push(videoOnly[0]);
          }
        }
        
        const formats = videoFormats.map((f, index) => {
          let size = 0;
          if (f.contentLength) {
            size = parseInt(f.contentLength, 10);
          } else if (f.bitrate && info.video_details.durationInSec) {
            size = Math.floor((f.bitrate * info.video_details.durationInSec) / 8);
          }

          return {
            id: `yt-${index}`,
            quality: f.qualityLabel || "HD Quality",
            format: f.mimeType ? f.mimeType.split(";")[0] : "video/mp4",
            size: size,
            url: f.url,
            supportsRange: true,
            title: info.video_details.title || "YouTube_Video"
          };
        });
        
        return res.json({ formats });
      } catch (playError: any) {
        if (!String(playError?.message).includes("Sign in to confirm")) {
          console.log("play-dl fallback to youtube-dl-exec", playError.message);
        }
        try {
          const info = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificates: true,
            preferFreeFormats: true,
            addHeader: [
              "referer:youtube.com",
              "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ],
          }) as any;
          
          let videoFormats = info.formats.filter((f: any) => f.vcodec !== "none" && f.acodec !== "none");
          if (videoFormats.length === 0) {
            const videoOnly = info.formats.filter((f: any) => f.vcodec !== "none");
            if (videoOnly.length > 0) {
              videoOnly.sort((a: any, b: any) => (b.tbr || 0) - (a.tbr || 0));
              videoFormats.push(videoOnly[0]);
            }
          }
          
          const formats = videoFormats.map((f: any, index: number) => {
            let size = f.filesize || f.filesize_approx || 0;
            return {
              id: `yt-fallback-${index}`,
              quality: f.format_note || f.resolution || "Direct Stream",
              format: f.ext ? `video/${f.ext}` : "video/mp4",
              size: size,
              url: f.url,
              supportsRange: true,
              title: info.title || "YouTube_Video"
            };
          });
          
          return res.json({ formats });
        } catch (ytExecErr: any) {
          const errStr = String(ytExecErr?.message || ytExecErr);
          if (errStr.includes("Sign in to confirm you’re not a bot") || errStr.includes("Sign in to confirm")) {
             return res.status(403).json({ error: "YouTube has temporarily blocked this server IP (Google Cloud) from downloading videos to prevent bot abuse. Please run the app locally or supply valid YouTube cookies." });
          }
          console.error("youtube-dl-exec error", errStr);
          return res.status(500).json({ error: "Failed to extract YouTube video. The server might be blocked by YouTube." });
        }
      }
    }

    // Direct links HEAD request
    let size = 0;
    let contentType = "application/octet-stream";
    let acceptRanges = false;
    
    try {
      const response = await axios.head(url, { timeout: 8000 });
      const contentLength = response.headers["content-length"] as string | undefined;
      contentType = (response.headers["content-type"] as string) || "application/octet-stream";
      acceptRanges = response.headers["accept-ranges"] === "bytes";
      size = contentLength ? parseInt(contentLength, 10) : 0;
    } catch (headError: any) {
      console.log("HEAD request failed, using defaults", headError.message);
    }
    
    const formats = [
      {
        id: "direct",
        quality: "Direct Source Stream",
        format: contentType,
        size: size,
        url: url,
        supportsRange: acceptRanges
      }
    ];

    res.json({ formats });
  } catch (error: any) {
    console.error("Analyze error:", error.message);
    res.status(500).json({ error: "Failed to analyze URL" });
  }
});

// Sample Range-Supporting Route for Wizard & Instant Multi-Thread Benchmark
const DEMO_FILE_SIZE = 12 * 1024 * 1024; // 12 MB

app.head("/api/sample-demo.dat", (req, res) => {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Length", DEMO_FILE_SIZE);
  res.setHeader("Content-Disposition", 'attachment; filename="TurboSpeed_Sample_12MB.zip"');
  res.status(200).end();
});

app.get("/api/sample-demo.dat", (req, res) => {
  const range = req.headers.range;
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Disposition", 'attachment; filename="TurboSpeed_Sample_12MB.zip"');

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : DEMO_FILE_SIZE - 1;
    const chunksize = end - start + 1;

    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${DEMO_FILE_SIZE}`);
    res.setHeader("Content-Length", chunksize);

    const chunk = Buffer.alloc(chunksize, 0x5a);
    res.end(chunk);
  } else {
    res.setHeader("Content-Length", DEMO_FILE_SIZE);
    const buffer = Buffer.alloc(DEMO_FILE_SIZE, 0x5a);
    res.end(buffer);
  }
});

app.get("/api/downloads", (req, res) => {
  res.json(downloadManager.getAll());
});

app.get("/api/stats", (req, res) => {
  res.json(downloadManager.getStats());
});

app.post("/api/downloads", async (req, res) => {
  const { url, filename, connections } = req.body;
  
  try {
    const task = await downloadManager.addDownload(url, filename, connections);
    broadcast({ type: "NEW_DOWNLOAD", data: task });
    res.json(task);
  } catch (error: any) {
    console.error("Download error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/downloads/pause-all", (req, res) => {
  downloadManager.pauseAll();
  broadcast({ type: "UPDATE_ALL", data: downloadManager.getAll() });
  res.json({ success: true });
});

app.post("/api/downloads/resume-all", (req, res) => {
  downloadManager.resumeAll();
  broadcast({ type: "UPDATE_ALL", data: downloadManager.getAll() });
  res.json({ success: true });
});

app.post("/api/downloads/clear-completed", (req, res) => {
  const cleared = downloadManager.clearCompleted();
  broadcast({ type: "UPDATE_ALL", data: downloadManager.getAll() });
  res.json({ success: true, cleared });
});

app.post("/api/downloads/:id/pause", (req, res) => {
  const { id } = req.params;
  downloadManager.pauseDownload(id);
  res.json({ success: true });
});

app.post("/api/downloads/:id/resume", (req, res) => {
  const { id } = req.params;
  downloadManager.resumeDownload(id);
  res.json({ success: true });
});

app.delete("/api/downloads/:id", (req, res) => {
  const { id } = req.params;
  downloadManager.removeDownload(id);
  broadcast({ type: "DELETE_DOWNLOAD", data: { id } });
  res.json({ success: true });
});

// Direct file download route for completed items
app.get("/api/downloads/:id/file", (req, res) => {
  const { id } = req.params;
  const task = downloadManager.getTask(id);
  if (!task) {
    return res.status(404).json({ error: "Download task not found" });
  }

  const filePath = path.join(process.cwd(), "downloads", task.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found on disk or still being assembled" });
  }

  res.download(filePath, task.filename);
});

// Stream route for in-app video/audio player with seeking/Range support
app.get("/api/downloads/:id/stream", (req, res) => {
  const { id } = req.params;
  const task = downloadManager.getTask(id);
  if (!task) {
    return res.status(404).json({ error: "Download task not found" });
  }

  const filePath = path.join(process.cwd(), "downloads", task.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found on disk" });
  }

  res.sendFile(filePath);
});

// Repair and optimize video files for Windows Media Player (AAC-LC + FastStart)
app.post("/api/downloads/:id/repair", (req, res) => {
  const { id } = req.params;
  const task = downloadManager.getTask(id);
  if (!task) {
    return res.status(404).json({ error: "Download task not found" });
  }

  const filePath = path.join(process.cwd(), "downloads", task.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found on disk" });
  }

  const tempOut = filePath + ".repaired.mp4";
  const cmd = `ffmpeg -y -i "${filePath}" -c:v copy -c:a aac -b:a 128k -movflags +faststart "${tempOut}"`;

  exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
    if (error) {
      console.error("Manual repair error:", error);
      return res.status(500).json({ error: "Gagal memperbaiki video: " + error.message });
    }

    if (fs.existsSync(tempOut) && fs.statSync(tempOut).size > 1000) {
      try {
        fs.unlinkSync(filePath);
        fs.renameSync(tempOut, filePath);
        const newSize = fs.statSync(filePath).size;
        task.downloadedSize = newSize;
        task.totalSize = newSize;
        broadcast({ type: "UPDATE_DOWNLOAD", data: task.toJSON() });
        return res.json({
          success: true,
          message: "Video berhasil diperbaiki dan dikonversi ke format AAC-LC universal.",
          size: newSize,
        });
      } catch (e: any) {
        return res.status(500).json({ error: e.message });
      }
    }
    return res.status(500).json({ error: "File hasil perbaikan kosong" });
  });
});

// Ensure downloads directory exists and is mounted statically
const downloadDir = path.join(process.cwd(), "downloads");
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}
app.use("/downloads", express.static(downloadDir));

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
