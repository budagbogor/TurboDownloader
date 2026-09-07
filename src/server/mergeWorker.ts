import { parentPort, workerData } from "worker_threads";
import fs from "fs";
import path from "path";

async function mergeFiles(outputFile: string, segmentFiles: string[]) {
  const writeStream = fs.createWriteStream(outputFile);

  for (const segmentFile of segmentFiles) {
    await new Promise<void>((resolve, reject) => {
      const readStream = fs.createReadStream(segmentFile);
      readStream.pipe(writeStream, { end: false });
      readStream.on("end", () => {
        resolve();
      });
      readStream.on("error", (err) => {
        reject(err);
      });
    });
  }

  writeStream.end();

  return new Promise<void>((resolve, reject) => {
    writeStream.on("finish", () => {
      for (const segmentFile of segmentFiles) {
        try {
          fs.unlinkSync(segmentFile);
        } catch (e) {
          console.error(`Failed to delete segment file ${segmentFile}`, e);
        }
      }
      resolve();
    });
    writeStream.on("error", (err) => {
      reject(err);
    });
  });
}

if (parentPort && workerData) {
  const { outputFile, segmentFiles } = workerData;
  mergeFiles(outputFile, segmentFiles)
    .then(() => {
      parentPort?.postMessage({ success: true });
    })
    .catch((err) => {
      parentPort?.postMessage({ success: false, error: err.message });
    });
}
