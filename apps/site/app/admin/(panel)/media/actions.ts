"use server";

import { assertStaff } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { one, q } from "@/lib/admin/db";
import { mediaUsage, removeFiles } from "@/lib/admin/media";

export async function saveAlt(id: string, alt: string) {
  const staff = await assertStaff("media");
  const row = await one<{ alt: string; original_name: string }>("SELECT alt, original_name FROM media WHERE id = $1", [id]);
  if (!row) return { ok: false, message: "Файл не найден" };
  const next = alt.trim().slice(0, 300);
  if (next === row.alt) return { ok: true };
  await q("UPDATE media SET alt = $2 WHERE id = $1", [id, next]);
  await audit(staff, { action: "update", entity: "media", entityId: id, summary: `Описание файла ${row.original_name}`, before: { alt: row.alt }, after: { alt: next } });
  return { ok: true, message: "Сохранено" };
}

export async function usage(id: string) {
  await assertStaff("media");
  return mediaUsage(id);
}

export async function deleteMedia(id: string) {
  const staff = await assertStaff("media");
  const row = await one<{ original_name: string }>("SELECT original_name FROM media WHERE id = $1", [id]);
  if (!row) return { ok: false, message: "Файл не найден" };
  const used = await mediaUsage(id);
  if (used.length) return { ok: false, message: `Файл используется: ${used.join(", ")}` };
  await q("DELETE FROM media WHERE id = $1", [id]);
  await removeFiles(id);
  await audit(staff, { action: "delete", entity: "media", entityId: id, summary: `Удалён файл ${row.original_name}` });
  return { ok: true, message: "Файл удалён" };
}
