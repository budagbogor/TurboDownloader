import fs from "fs";
import path from "path";
import { exec, execSync } from "child_process";
import ffmpegStatic from "ffmpeg-static";

export interface MergeCtx {
  taskId: string;
  filename: string;
  outputDir: string;
  tempDir: string;
  getCategory: () => string;
  setStatus: (s: any) => void;
  setError: (s: string) => void;
  setFinalSize: (n: number) => void;
  stopSpeedCalculation: () => void;
}

export function getFfmpegBinary(): string | null {
  const packaged = typeof ffmpegStatic === "string" && ffmpegStatic ? ffmpegStatic : null;
  if (packaged && fs.existsSync(packaged)) return packaged;
  try {
    execSync("ffmpeg -version", { stdio: "ignore", windowsHide: true });
    return "ffmpeg";
  } catch {
    return null;
  }
}

export function hasFfmpegBinary(): boolean {
  return !!getFfmpegBinary();
}

export async function mergeSegments(
  segments: { file: string }[],
  ctx: MergeCtx
): Promise<void> {
  ctx.stopSpeedCalculation();
  const outputFile = path.join(ctx.outputDir, ctx.filename);
  const segmentFiles = segments.map((s) => s.file);

  try {
    if (segmentFiles.length === 1 && fs.existsSync(segmentFiles[0])) {
      try {
        fs.copyFileSync(segmentFiles[0], outputFile);
        fs.unlinkSync(segmentFiles[0]);
      } catch {
          await streamMerge(outputFile, segmentFiles);
        }
      } else {
        await streamMerge(outputFile, segmentFiles);
      }

    try {
      if (fs.existsSync(ctx.tempDir)) {
        fs.rmSync(ctx.tempDir, { recursive: true, force: true });
      }
    } catch (e) {}

    const category = ctx.getCategory();
    if (category === "video" || ctx.filename.toLowerCase().endsWith(".mp4")) {
      await optimizeVideoForCompatibility(outputFile);
    }

    try {
      const stat = fs.statSync(outputFile);
      ctx.setFinalSize(stat.size);
    } catch (e) {}

    ctx.setStatus("completed");
  } catch (err: any) {
    console.error(`Merge failed for ${ctx.filename}:`, err);
    ctx.setStatus("error");
    ctx.setError(`Failed to assemble final file: ${err.message}`);
  }
}

export async function streamMerge(outputFile: string, segmentFiles: string[]): Promise<void> {
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

export async function optimizeVideoForCompatibility(outputFile: string): Promise<void> {
  const ext = path.extname(outputFile).toLowerCase();
  if (![".mp4", ".mkv", ".mov", ".webm", ".avi", ".ts"].includes(ext)) {
    return;
  }

  const tempOptimized = outputFile + ".opt.mp4";
  const ffmpegBin = getFfmpegBinary();
  if (!ffmpegBin) {
    return;
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const cmd = `"${ffmpegBin}" -y -i "${outputFile}" -c:v copy -c:a aac -b:a 128k -movflags +faststart "${tempOptimized}"`;
      exec(cmd, { timeout: 60000 }, (error) => {
        if (error) reject(error);
        else resolve();
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
