import type { Metadata } from "next";
import Link from "next/link";
import { can, requireStaff } from "@/lib/admin/auth";
import { one } from "@/lib/admin/db";
import { listTariffs, parseTiers } from "@/lib/admin/tariffs";
import { TariffsEditor } from "./TariffsEditor";

export const metadata: Metadata = { title: "Тарифы партнёров" };

export default async function TariffsPage() {
  const staff = await requireStaff("partners");
  const tariffs = await listTariffs(true);
  const own = await one<{ n: number }>("SELECT count(*)::int AS n FROM partners WHERE tariff_id IS NULL AND status NOT IN ('applied', 'rejected')");
  return (
    <>
      <div className="a-crumbs"><Link href="/admin/partners">Партнёры</Link><span>/</span><span>Тарифы</span></div>
      <div className="a-head">
        <div>
          <h1>Тарифы вознаграждения</h1>
          <p>Сколько партнёр получает за подтверждённый отчёт клиента. Ступени повышают сумму с N-го отчёта за месяц. Сумма фиксируется в момент зачисления: правка тарифа не меняет прошлые начисления.</p>
        </div>
      </div>
      <TariffsEditor
        canEdit={can(staff, "tariffs")}
        tariffs={tariffs.map((t) => ({
          id: t.id, name: t.name, fee: t.fee, note: t.note, isDefault: t.is_default, archived: Boolean(t.archived_at),
          partners: (t.partners ?? 0) + (t.is_default ? own?.n ?? 0 : 0),
          tiers: parseTiers(t.tiers),
        }))}
      />
    </>
  );
}
