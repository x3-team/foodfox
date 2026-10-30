import type { MediaItem } from "@/lib/admin/media";

/** Files the chunked route takes: videos of any size and PDFs over the 20 MB of the regular upload. */
export const isLarge = (file: File) => file.type.startsWith("video/") || (file.type === "application/pdf" && file.size > 20 * 1024 * 1024);

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Ошибка ${res.status}`);
  return data as T;
}

/** Sends a video or a big PDF to /admin/api/media/upload in chunks; `onProgress` gets 0…1. A failed chunk is retried
    up to 5 times from the size the server reports, so a short network drop does not restart a 1 GB upload. */
export async function uploadLarge(file: File, onProgress: (share: number) => void, signal?: AbortSignal): Promise<MediaItem> {
  const { id, chunk } = await json<{ id: string; chunk: number }>(
    await fetch("/admin/api/media/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: file.name, type: file.type, size: file.size }), signal }),
  );
  let offset = 0;
  let failures = 0;
  onProgress(0);
  while (offset < file.size) {
    try {
      const res = await fetch(`/admin/api/media/upload?id=${id}&offset=${offset}`, { method: "PUT", body: file.slice(offset, offset + chunk), signal });
      offset = (await json<{ received: number }>(res)).received;
      failures = 0;
      onProgress(offset / file.size);
    } catch (error) {
      if (signal?.aborted || ++failures > 5) throw error;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** failures));
    }
  }
  const { item } = await json<{ item: MediaItem }>(
    await fetch("/admin/api/media/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, done: true }), signal }),
  );
  return item;
}
