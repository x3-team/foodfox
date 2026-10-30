"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { one, q, tx } from "@/lib/admin/db";
import { DOC_KINDS, isDocKind, STOP_DAYS, SUBJECTS, type LegalDocument } from "@/lib/admin/consents";

type Result = { ok: boolean; message?: string };
export type DocumentInput = { kind: string; version: string; title: string; url: string; note: string; effectiveFrom: string; current: boolean };

export async function saveDocument(input: DocumentInput): Promise<Result> {
  const staff = await assertStaff("legal");
  if (!isDocKind(input.kind)) return { ok: false, message: "Выберите вид документа" };
  const version = input.version.trim().slice(0, 40);
  if (!version) return { ok: false, message: "Укажите номер версии, например 1.1" };
  const title = input.title.trim().slice(0, 200) || DOC_KINDS[input.kind];
  const url = input.url.trim().slice(0, 500);
  if (url && !/^(\/[^\s]*|https:\/\/[^\s]+)$/.test(url)) return { ok: false, message: "Ссылка: путь на сайте (/privacy) или адрес https://…" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)) return { ok: false, message: "Укажите дату вступления в силу" };
  const kind = input.kind;
  try {
    const row = await tx(async (c) => {
      if (input.current) await c.query("UPDATE legal_documents SET is_current = false WHERE kind = $1 AND is_current", [kind]);
      const { rows } = await c.query<{ id: string }>(
        `INSERT INTO legal_documents (kind, version, title, url, note, effective_from, is_current, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [kind, version, title, url || null, input.note.trim().slice(0, 1000) || null, input.effectiveFrom, input.current, staff.id],
      );
      return rows[0];
    });
    await audit(staff, {
      action: "create", entity: "legal_document", entityId: row.id,
      summary: `${DOC_KINDS[kind]}: версия ${version}${input.current ? " (действующая)" : ""}`,
      after: { kind, version, title, url, effectiveFrom: input.effectiveFrom, current: input.current },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return { ok: false, message: `Версия ${version} у этого документа уже есть` };
    throw error;
  }
  revalidatePath("/admin/legal", "layout");
  return { ok: true, message: input.current ? "Версия добавлена и стала действующей" : "Версия добавлена" };
}

export async function makeCurrent(id: string): Promise<Result> {
  const staff = await assertStaff("legal");
  const doc = await one<LegalDocument>("SELECT * FROM legal_documents WHERE id = $1", [id]);
  if (!doc) return { ok: false, message: "Документ не найден" };
  await tx(async (c) => {
    await c.query("UPDATE legal_documents SET is_current = false WHERE kind = $1 AND is_current AND id <> $2", [doc.kind, id]);
    await c.query("UPDATE legal_documents SET is_current = true WHERE id = $1", [id]);
  });
  await audit(staff, { action: "update", entity: "legal_document", entityId: id, summary: `${DOC_KINDS[doc.kind]}: действующая версия ${doc.version}` });
  revalidatePath("/admin/legal", "layout");
  return { ok: true, message: `Действует версия ${doc.version}` };
}

/** A withdrawal received by letter or phone: every active consent of the person, with the 30-day deadline. */
export async function withdrawConsents(subject: string, subjectId: string, reason: string): Promise<Result> {
  const staff = await assertStaff("consents");
  if (!(subject in SUBJECTS) || !/^([0-9a-f-]{36}|\d{1,18})$/i.test(subjectId)) return { ok: false, message: "Не найдено, чьё согласие отзывать" };
  const why = reason.trim().slice(0, 500);
  if (!why) return { ok: false, message: "Укажите основание: например, «письмо от 30.10 на privacy@…»" };
  const rows = await q<{ id: string; contact: string | null }>(
    `UPDATE consents SET withdrawn_at = now(), withdraw_source = 'admin', withdraw_reason = $3, withdrawn_by = $4,
            stop_by = CURRENT_DATE + ${STOP_DAYS}
      WHERE subject_type = $1 AND subject_id = $2 AND withdrawn_at IS NULL RETURNING id, contact`,
    [subject, subjectId, why, staff.id],
  );
  if (!rows.length) return { ok: false, message: "Действующих согласий нет: возможно, уже отозваны" };
  await audit(staff, {
    action: "update", entity: "consent", entityId: subjectId,
    summary: `Отзыв согласия: ${SUBJECTS[subject as keyof typeof SUBJECTS]} ${rows[0].contact ?? ""} (${rows.length}), основание: ${why}`,
  });
  revalidatePath("/admin/legal", "layout");
  revalidatePath("/admin/app/users", "layout");
  return { ok: true, message: `Согласие отозвано. Прекратить обработку нужно в течение ${STOP_DAYS} дней` };
}
