-- Partner reward tariffs (admin → Партнёры → Тарифы). A tariff is a fee per confirmed client report and, optionally,
-- steps by the number of reports credited in the same month: {"from": 11, "fee": 2800} pays 2800 from the 11th report
-- on. The fee is fixed on the report when it is credited, so changing a tariff never rewrites past months.
-- Safe to run more than once: apps/site applies it on every start (lib/admin/db.ts).

CREATE TABLE IF NOT EXISTS partner_tariffs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    fee         INT NOT NULL CHECK (fee >= 0),
    tiers       JSONB NOT NULL DEFAULT '[]',
    note        TEXT NOT NULL DEFAULT '',
    is_default  BOOLEAN NOT NULL DEFAULT false,
    archived_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS partner_tariffs_one_default ON partner_tariffs (is_default) WHERE is_default;

ALTER TABLE partners ADD COLUMN IF NOT EXISTS tariff_id UUID REFERENCES partner_tariffs(id) ON DELETE SET NULL;
-- Which tariff paid a report: the history of the money, shown on the partner card.
ALTER TABLE partner_reports ADD COLUMN IF NOT EXISTS tariff_id UUID REFERENCES partner_tariffs(id) ON DELETE SET NULL;

-- The first default tariff carries the fee the site used so far (Цены → prices.partnerFee), so nothing changes on deploy.
INSERT INTO partner_tariffs (name, fee, is_default, note)
SELECT 'Базовый',
       coalesce((SELECT CASE WHEN jsonb_typeof(value) = 'number' THEN value::text::int END FROM site_content WHERE key = 'prices.partnerFee'), 2400),
       true, 'Создан автоматически из общего вознаграждения в разделе «Цены»'
WHERE NOT EXISTS (SELECT 1 FROM partner_tariffs);
