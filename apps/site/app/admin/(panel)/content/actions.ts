"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { assertStaff, type Area } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { one, q, tx } from "@/lib/admin/db";
import { DEFAULTS, FIELD_BY_KEY, PRICE_LABS_KEY, type Field } from "@/lib/cms/registry";
import { CONTENT_TAG } from "@/lib/cms/server";

type Result = { ok: boolean; message?: string };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const str = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");

/** Brings a value from the editor to the shape the field expects; throws with a readable message otherwise. */
function clean(field: Field, value: unknown): unknown {
  switch (field.type) {
    case "text": case "url": case "textarea": case "lines": {
      const v = str(value).replace(/\r\n/g, "\n");
      if (field.type === "url" && v && !/^(https?:\/\/|\/|#|mailto:|tel:)/.test(v)) throw new Error(`«${field.label}»: ссылка должна начинаться с https:// или /`);
      if ("max" in field && field.max && v.length > field.max) throw new Error(`«${field.label}»: не длиннее ${field.max} символов`);
      if (!v.trim() && field.type !== "url") throw new Error(`«${field.label}» не может быть пустым`);
      return v;
    }
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) throw new Error(`«${field.label}»: нужно число`);
      return n;
    }
    case "boolean":
      return Boolean(value);
    case "image": {
      const v = value as { src?: unknown; srcSet?: unknown; alt?: unknown };
      if (!v || typeof v.src !== "string" || !v.src.startsWith("/")) throw new Error(`«${field.label}»: выберите картинку`);
      return { src: v.src, srcSet: str(v.srcSet, 2000) || undefined, alt: str(v.alt, 300) || undefined };
    }
    case "qa": {
      if (!Array.isArray(value)) throw new Error(`«${field.label}»: неверный формат`);
      const pairs = value.map((p) => [str(p?.[0], 500).trim(), str(p?.[1], 5000).trim()] as [string, string]).filter(([qq, a]) => qq || a);
      if (pairs.some(([qq, a]) => !qq || !a)) throw new Error(`«${field.label}»: у каждого вопроса нужен ответ`);
      return pairs;
    }
    case "json":
      return cleanCollection(field.key, value);
    case "list": {
      if (!Array.isArray(value)) throw new Error(`«${field.label}»: неверный формат`);
      if (field.fixed && value.length !== field.default.length) throw new Error(`«${field.label}»: число элементов менять нельзя`);
      return value.map((item, index) => {
        const base = (field.default[index] ?? {}) as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const f of field.of) {
          const v = (item as Record<string, unknown>)?.[f.name];
          if (f.readonly) { out[f.name] = base[f.name]; continue; }
          if (f.type === "number") out[f.name] = Number(v) || 0;
          else if (f.type === "boolean") out[f.name] = Boolean(v);
          else if (f.type === "qa") out[f.name] = clean({ key: "", label: `${field.itemTitle} ${index + 1}`, type: "qa", default: [] }, v);
          else out[f.name] = str(v).trim();
        }
        return out;
      });
    }
  }
}

function cleanCollection(key: string, value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Неверный формат");
  if (key === "reviews.list") {
    const ids = new Set<string>();
    return value.map((raw, index) => {
      const r = raw as Record<string, unknown>;
      const id = str(r.id, 60) || `r-${Date.now()}-${index}`;
      if (ids.has(id)) throw new Error("Повторяется id отзыва");
      ids.add(id);
      const video = Boolean(r.video);
      const out = {
        id, kind: video ? "Видео" : "Текст", who: str(r.who, 40) === "Специалисты" ? "Специалисты" : "Пациенты",
        tag: str(r.tag, 60).trim() || "Общее самочувствие", photo: str(r.photo, 300), video, title: str(r.title, 200).trim(),
        name: str(r.name, 120).trim(), role: str(r.role, 120).trim() || undefined, text: str(r.text, 3000).trim(),
        hidden: Boolean(r.hidden) || undefined, leadId: str(r.leadId, 20) || undefined,
      };
      if (!out.name) throw new Error(`Отзыв ${index + 1}: нужно имя`);
      if (!video && out.text.length < 10) throw new Error(`Отзыв «${out.name}»: текст слишком короткий`);
      if (video && !out.photo) throw new Error(`Видеоотзыв «${out.name}»: нужна обложка`);
      return out;
    });
  }
  throw new Error(`Неизвестная коллекция ${key}`);
}

function areaFor(key: string): Area {
  if (key.startsWith("prices.")) return "prices";
  if (key.startsWith("reviews.")) return "reviews";
  if (key.startsWith("blog.")) return "blog";
  return "content";
}

/** Saves the changed fields of one editor at once. A value equal to the default removes the row. */
export async function saveContent(changes: Record<string, unknown>, label: string): Promise<Result> {
  const keys = Object.keys(changes);
  if (!keys.length) return { ok: true, message: "Нечего сохранять" };
  const areas = new Set(keys.map(areaFor));
  let staff;
  try {
    for (const area of areas) staff = await assertStaff(area);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Нет доступа" };
  }
  if (!staff) return { ok: false, message: "Нет доступа" };
  const cleaned: Record<string, unknown> = {};
  try {
    for (const key of keys) {
      if (key === PRICE_LABS_KEY) {
        const map = changes[key] as Record<string, unknown>;
        cleaned[key] = Object.fromEntries(Object.entries(map ?? {}).map(([k, v]) => [k.slice(0, 80), str(v, 60).trim()]).filter(([, v]) => v));
        continue;
      }
      const field = FIELD_BY_KEY[key];
      if (!field) throw new Error(`Неизвестное поле ${key}`);
      cleaned[key] = clean(field, changes[key]);
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Проверьте поля" };
  }
  const me = staff;
  const changed: string[] = [];
  await tx(async (db) => {
    for (const [key, value] of Object.entries(cleaned)) {
      const { rows } = await db.query<{ value: unknown }>("SELECT value FROM site_content WHERE key = $1", [key]);
      const before = rows[0] ? rows[0].value : DEFAULTS[key];
      if (same(before, value)) continue;
      if (same(value, DEFAULTS[key])) await db.query("DELETE FROM site_content WHERE key = $1", [key]);
      else {
        await db.query(
          `INSERT INTO site_content (key, value, updated_at, updated_by, updated_by_name) VALUES ($1, $2, now(), $3, $4)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by, updated_by_name = EXCLUDED.updated_by_name`,
          [key, JSON.stringify(value), me.id, me.name || me.email],
        );
      }
      await db.query("INSERT INTO content_revisions (key, value, author_id, author_name) VALUES ($1, $2, $3, $4)", [key, JSON.stringify(value), me.id, me.name || me.email]);
      changed.push(key);
      await audit(me, {
        action: "update", entity: key.startsWith("prices.") ? "price" : key.startsWith("reviews.") ? "review" : key.startsWith("blog.") ? "article" : "content", entityId: key,
        summary: `${label}: ${FIELD_BY_KEY[key]?.label ?? (key === PRICE_LABS_KEY ? "цены сетей" : key)}`,
        before, after: value,
      }, db);
    }
  });
  if (changed.length) {
    revalidateTag(CONTENT_TAG);
    revalidatePath("/", "layout");
  }
  return { ok: true, message: changed.length ? `Опубликовано: ${changed.length}` : "Изменений нет" };
}

export async function fieldHistory(key: string) {
  await assertStaff(areaFor(key));
  return q<{ id: string; value: unknown; created_at: Date; author_name: string }>(
    "SELECT id, value, created_at, author_name FROM content_revisions WHERE key = $1 ORDER BY created_at DESC LIMIT 20",
    [key],
  ).then((rows) => rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() })));
}

export async function revisionValue(id: string) {
  const row = await one<{ key: string; value: unknown }>("SELECT key, value FROM content_revisions WHERE id = $1", [id]);
  if (!row) return null;
  await assertStaff(areaFor(row.key));
  return row;
}
