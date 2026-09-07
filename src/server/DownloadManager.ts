import { DownloadTask } from "./DownloadTask.js";
import fs from "fs";
import path from "path";

class DownloadManager {
  private tasks: Map<string, DownloadTask> = new Map();

  constructor() {
    this.restoreExistingFiles();
  }

  private restoreExistingFiles() {
    try {
      const downloadDir = path.join(process.cwd(), "downloads");
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
        return;
      }

      const files = fs.readdirSync(downloadDir);
      for (const file of files) {
        if (file.startsWith(".")) continue;
        const filePath = path.join(downloadDir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile() && stat.size > 0) {
            const task = new DownloadTask("local://" + file, file, 8);
            task.status = "completed";
            task.totalSize = stat.size;
            task.downloadedSize = stat.size;
            task.speed = 0;
            this.tasks.set(task.id, task);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error("Failed to restore existing files:", e);
    }
  }

  async addDownload(url: string, filename?: string, connections?: number): Promise<any> {
    const task = new DownloadTask(url, filename, connections);
    await task.initialize();
    this.tasks.set(task.id, task);
    task.start();
    return task.toJSON();
  }

  pauseDownload(id: string) {
    const task = this.tasks.get(id);
    if (task) {
      task.pause();
    }
  }

  resumeDownload(id: string) {
    const task = this.tasks.get(id);
    if (task) {
      task.resume();
    }
  }

  pauseAll() {
    for (const task of this.tasks.values()) {
      if (task.status === "downloading") {
        task.pause();
      }
    }
  }

  resumeAll() {
    for (const task of this.tasks.values()) {
      if (task.status === "paused" || task.status === "error") {
        task.resume();
      }
    }
  }

  clearCompleted() {
    const completedIds: string[] = [];
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === "completed") {
        completedIds.push(id);
      }
    }
    for (const id of completedIds) {
      this.tasks.delete(id);
    }
    return completedIds;
  }

  getStats() {
    let totalSpeed = 0;
    let activeCount = 0;
    let completedCount = 0;
    let pausedCount = 0;

    for (const task of this.tasks.values()) {
      if (task.status === "downloading") {
        activeCount++;
        totalSpeed += task.speed;
      } else if (task.status === "completed") {
        completedCount++;
      } else if (task.status === "paused") {
        pausedCount++;
      }
    }

    return {
      totalTasks: this.tasks.size,
      activeCount,
      completedCount,
      pausedCount,
      totalSpeed,
    };
  }

  removeDownload(id: string) {
    const task = this.tasks.get(id);
    if (task) {
      task.cancel();
      
      const filePath = path.join(process.cwd(), "downloads", task.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error("Failed to delete output file:", err);
        }
      }
      
      this.tasks.delete(id);
    }
  }

  getTask(id: string): DownloadTask | undefined {
    return this.tasks.get(id);
  }

  getAll() {
    return Array.from(this.tasks.values()).map(task => task.toJSON());
  }
}

export const downloadManager = new DownloadManager();
