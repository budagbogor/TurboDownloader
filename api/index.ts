import { createServer, IncomingMessage, ServerResponse } from "http";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../dist-server/server.js";

let listenCalled = false;

function createLocalListenerForApp(): Promise<void> {
  if (listenCalled) return Promise.resolve();
  listenCalled = true;
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await createLocalListenerForApp();
  return app(req as unknown as IncomingMessage, res as unknown as ServerResponse);
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: "50mb",
  },
};
