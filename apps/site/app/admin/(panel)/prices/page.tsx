import type { Metadata } from "next";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { LabPrices } from "@/components/admin/LabPrices";
import { requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { PRICE_FIELDS, PRICE_LABS_KEY } from "@/lib/cms/registry";
import { PARTNERS } from "@/lib/labs";

export const metadata: Metadata = { title: "Цены" };

export default async function PricesPage() {
  await requireStaff("prices");
  const rows = await q<{ key: string; value: unknown }>("SELECT key, value FROM site_content WHERE key LIKE 'prices.%'");
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return (
    <>
      <div className="a-head">
        <div>
          <h1>Цены</h1>
          <p>Сейчас сайт цены не публикует: стоимость называет лаборатория. Включите показ — и цена «от» появится в блоке лабораторий на главной и на странице «Где сдать тест», а цены сетей — в их карточках.</p>
        </div>
      </div>
      <div className="a-stack">
        <ContentEditor label="Цены" sections={[{ title: "Общие", fields: PRICE_FIELDS }]} saved={saved} />
        <LabPrices networks={PARTNERS.map((p) => p.name)} saved={(saved[PRICE_LABS_KEY] as Record<string, string>) ?? {}} />
      </div>
    </>
  );
}
