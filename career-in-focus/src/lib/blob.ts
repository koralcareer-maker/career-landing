import { put, list, type PutBlobResult } from "@vercel/blob";

/**
 * Storage layout for the LinkedIn photo generator.
 *
 *   linkedin-photos/
 *     <userId>/
 *       <timestamp>/
 *         sources/
 *           source-1.jpg
 *           source-2.jpg
 *           source-3.jpg
 *         generated-1.png
 *         generated-2.png
 *
 * The same prefix scheme works for both saved sources (uploaded by the
 * client direct-to-Blob) and generated outputs (saved by the API route
 * after the model returns).
 *
 * History is reconstructed by listing `linkedin-photos/<userId>/` and
 * grouping by timestamp folder. No DB row is required — the URLs in
 * Blob are the source of truth.
 */

export const BLOB_ROOT = "linkedin-photos";

export function userPrefix(userId: string): string {
  return `${BLOB_ROOT}/${userId}/`;
}

export function jobPrefix(userId: string, timestamp: number): string {
  return `${BLOB_ROOT}/${userId}/${timestamp}/`;
}

export function sourcePathname(userId: string, timestamp: number, index: number, ext: string): string {
  return `${jobPrefix(userId, timestamp)}sources/source-${index + 1}.${ext}`;
}

export function generatedPathname(userId: string, timestamp: number, index: number): string {
  return `${jobPrefix(userId, timestamp)}generated-${index + 1}.png`;
}

/** Save a generated PNG from OpenAI to Blob. Returns the public URL. */
export async function saveGenerated(
  userId: string,
  timestamp: number,
  index: number,
  pngBytes: Buffer
): Promise<PutBlobResult> {
  return put(generatedPathname(userId, timestamp, index), pngBytes, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export interface HistoryJob {
  /** unix ms timestamp – also the folder name */
  timestamp: number;
  /** ISO string for display */
  createdAt: string;
  /** generated image URLs, sorted by index */
  generatedUrls: string[];
}

/**
 * List a user's generation history.
 *
 * Strategy: list everything under `linkedin-photos/<userId>/`,
 * keep only `generated-N.png` blobs (skip sources), group by timestamp
 * folder, and return newest-first.
 */
export async function listUserHistory(userId: string, limit = 12): Promise<HistoryJob[]> {
  const prefix = userPrefix(userId);
  const groups = new Map<number, { url: string; index: number }[]>();

  let cursor: string | undefined;
  // Pull pages until exhausted or we have enough timestamps
  // (each page is up to 1000 entries; usually one page is enough)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      // pathname like: linkedin-photos/<uid>/<ts>/generated-N.png
      const rel = blob.pathname.slice(prefix.length); // <ts>/...
      const parts = rel.split("/");
      if (parts.length < 2) continue;
      const ts = Number(parts[0]);
      if (!Number.isFinite(ts)) continue;
      const file = parts[parts.length - 1];
      const m = /^generated-(\d+)\.png$/.exec(file);
      if (!m) continue; // skip sources
      const index = Number(m[1]);
      const arr = groups.get(ts) ?? [];
      arr.push({ url: blob.url, index });
      groups.set(ts, arr);
    }
    if (!page.hasMore || !page.cursor) break;
    cursor = page.cursor;
  }

  const jobs: HistoryJob[] = [];
  for (const [timestamp, items] of groups) {
    items.sort((a, b) => a.index - b.index);
    jobs.push({
      timestamp,
      createdAt: new Date(timestamp).toISOString(),
      generatedUrls: items.map((i) => i.url),
    });
  }
  jobs.sort((a, b) => b.timestamp - a.timestamp);
  return jobs.slice(0, limit);
}
