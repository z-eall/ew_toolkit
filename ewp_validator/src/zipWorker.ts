// Runs buildZip off the main thread so a very large "Export all" (the
// scripter's real-world case: a couple thousand files across many folders)
// never blocks page interaction. Progress is throttled here — reporting every
// single entry across a Worker's postMessage boundary would itself add
// overhead for a 2000-entry batch — to roughly 1% steps, always including the
// final 100% so the caller's banner reaches "done" exactly at completion.
import { buildZip, type ZipEntry } from "./zip";

export interface ZipWorkerRequest {
  entries: ZipEntry[];
}

export type ZipWorkerResponse =
  | { type: "progress"; done: number; total: number }
  | { type: "done"; bytes: Uint8Array }
  | { type: "error"; message: string };

self.onmessage = (e: MessageEvent<ZipWorkerRequest>) => {
  const { entries } = e.data;
  try {
    const total = entries.length;
    const step = Math.max(1, Math.floor(total / 100));
    let lastReported = 0;
    const bytes = buildZip(entries, (done) => {
      if (done - lastReported < step && done !== total) return;
      lastReported = done;
      const msg: ZipWorkerResponse = { type: "progress", done, total };
      postMessage(msg);
    });
    const msg: ZipWorkerResponse = { type: "done", bytes };
    postMessage(msg, { transfer: [bytes.buffer] });
  } catch (err) {
    const msg: ZipWorkerResponse = { type: "error", message: err instanceof Error ? err.message : String(err) };
    postMessage(msg);
  }
};
