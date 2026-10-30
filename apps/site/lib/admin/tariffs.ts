import { one, q } from "@/lib/admin/db";

/* Partner reward tariffs (migrations/012_partner_tariffs.sql). The fee of a report is decided once, when it is
   credited: the partner's own fee if the card has one, otherwise their tariff (or the default tariff) with the step
   for this report's number in the month. Past reports keep what they were credited with. */

export type Tier = { from: number; fee: number };
export type Tariff = { id: string; name: string; fee: number; tiers: Tier[]; note: string; is_default: boolean; archived_at: Date | null; partners?: number };

export function parseTiers(value: unknown): Tier[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((t) => ({ from: Number((t as Tier)?.from), fee: Number((t as Tier)?.fee) }))
    .filter((t) => Number.isInteger(t.from) && t.from >= 2 && Number.isInteger(t.fee) && t.fee >= 0)
    .sort((a, b) => a.from - b.from);
}

/** The fee for the n-th report credited in a month (n counts from 1). */
export function feeForNth(tariff: Pick<Tariff, "fee" | "tiers">, n: number): number {
  let fee = tariff.fee;
  for (const t of parseTiers(tariff.tiers)) if (n >= t.from) fee = t.fee;
  return fee;
}

/** «2 400 ₽; с 11-го в месяце — 2 800 ₽» */
export function tariffSummary(tariff: Pick<Tariff, "fee" | "tiers">): string {
  const rub = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;
  const steps = parseTiers(tariff.tiers).map((t) => `с ${t.from}-го в месяце — ${rub(t.fee)}`);
  return [rub(tariff.fee), ...steps].join("; ");
}

export async function listTariffs(withArchived = false): Promise<Tariff[]> {
  return q<Tariff>(
    `SELECT t.*, (SELECT count(*)::int FROM partners p WHERE p.tariff_id = t.id) AS partners
       FROM partner_tariffs t ${withArchived ? "" : "WHERE t.archived_at IS NULL"}
      ORDER BY t.is_default DESC, t.archived_at NULLS FIRST, t.name`,
  );
}

/** The tariff a partner is paid by: their own, or the default one. */
export async function tariffOf(partnerId: string): Promise<Tariff | null> {
  return one<Tariff>(
    `SELECT t.* FROM partner_tariffs t
      WHERE t.id = coalesce((SELECT tariff_id FROM partners WHERE id = $1), (SELECT id FROM partner_tariffs WHERE is_default LIMIT 1))`,
    [partnerId],
  );
}

/** What a report credited now pays. `fallback` is the old general fee, used only when there is no tariff at all. */
export async function feeForNewCredit(partnerId: string, fallback: number): Promise<{ fee: number; tariffId: string | null }> {
  const own = await one<{ fee: number | null }>("SELECT fee FROM partners WHERE id = $1", [partnerId]);
  if (own?.fee != null) return { fee: own.fee, tariffId: null };
  const tariff = await tariffOf(partnerId);
  if (!tariff) return { fee: fallback, tariffId: null };
  const [{ n }] = await q<{ n: number }>(
    `SELECT count(*)::int AS n FROM partner_reports
      WHERE partner_id = $1 AND status = 'credited'
        AND date_trunc('month', coalesce(verified_at, created_at) AT TIME ZONE 'Europe/Moscow') = date_trunc('month', now() AT TIME ZONE 'Europe/Moscow')`,
    [partnerId],
  );
  return { fee: feeForNth(tariff, n + 1), tariffId: tariff.id };
}
