import type { Pool } from "pg";
import { formatPhone } from "@/lib/otp";
import { CONTRACT_VERSION, contractFor, isLegalForm, LEGAL_FORMS, type LegalForm } from "./contracts";
import { inTx, queueEvent, requirePartnerPool, sessionPhone } from "./db";
import { pdEnabled, sealJson, storeSealedFile } from "./seal";
import * as v from "./validate";

/* Joining the program, step by step as in БПИТ12.8:
   врач? → гражданство РФ? → форма (ИП / СЗ / ФЛ) → договор (принимаю / не принимаю) → личные данные и сканы.
   A doctor goes to the client service specialist (a lead of kind «partner_doctor»), a non-citizen and a declined
   contract end the registration. The state lives in partner_onboarding under the phone confirmed by SMS. */

export type OnboardingStatus = "in_progress" | "doctor" | "not_citizen" | "declined" | "submitted";
export type Step = "doctor" | "citizen" | "form" | "contract" | "data" | "done";

export type OnboardingState = {
  phone: string;
  status: OnboardingStatus;
  step: Step;
  isDoctor: boolean | null;
  citizenRf: boolean | null;
  legalForm: LegalForm | null;
  contract: ReturnType<typeof contractFor> | null;
  partnerStatus: string | null;
  documentsEnabled: boolean;
};

type Row = { status: OnboardingStatus; is_doctor: boolean | null; citizen_rf: boolean | null; legal_form: LegalForm | null; contract_accepted_at: Date | null };

function stepOf(row: Row | undefined): Step {
  if (!row || row.is_doctor === null) return "doctor";
  if (row.status === "submitted") return "done";
  if (row.status !== "in_progress") return "done";
  if (row.citizen_rf === null) return "citizen";
  if (!row.legal_form) return "form";
  if (!row.contract_accepted_at) return "contract";
  return "data";
}

async function phoneFor(p: Pool, userId: string): Promise<string> {
  const phone = await sessionPhone(p, userId);
  if (!phone) throw new Error("Войдите по номеру телефона");
  return phone;
}

export async function onboardingState(userId: string): Promise<OnboardingState> {
  const p = await requirePartnerPool();
  const phone = await phoneFor(p, userId);
  const { rows } = await p.query<Row>(`SELECT * FROM partner_onboarding WHERE phone = $1`, [phone]);
  const partner = await p.query(`SELECT status FROM partners WHERE phone = $1`, [phone]);
  const row = rows[0];
  return {
    phone: formatPhone(phone),
    status: row?.status ?? "in_progress",
    step: stepOf(row),
    isDoctor: row?.is_doctor ?? null,
    citizenRf: row?.citizen_rf ?? null,
    legalForm: row?.legal_form ?? null,
    contract: row?.legal_form ? contractFor(row.legal_form) : null,
    partnerStatus: (partner.rows[0]?.status as string | undefined) ?? null,
    documentsEnabled: pdEnabled(),
  };
}

/** One answer of the questionnaire. `restart` begins again unless the application is already sent. */
export async function answer(userId: string, step: string, value: unknown): Promise<OnboardingState> {
  const p = await requirePartnerPool();
  const phone = await phoneFor(p, userId);
  const existing = await p.query(`SELECT status FROM partners WHERE phone = $1`, [phone]);
  if (["approved", "certified"].includes(existing.rows[0]?.status)) throw new Error("Вы уже партнёр — войдите в кабинет");
  await p.query(`INSERT INTO partner_onboarding (phone) VALUES ($1) ON CONFLICT (phone) DO NOTHING`, [phone]);
  const { rows } = await p.query<Row>(`SELECT * FROM partner_onboarding WHERE phone = $1`, [phone]);
  const row = rows[0];

  if (step === "restart") {
    if (row.status === "submitted") throw new Error("Заявка уже отправлена");
    await p.query(
      `UPDATE partner_onboarding SET status = 'in_progress', is_doctor = NULL, citizen_rf = NULL, legal_form = NULL,
              contract_version = NULL, contract_accepted_at = NULL, updated_at = now() WHERE phone = $1`,
      [phone],
    );
    return onboardingState(userId);
  }
  if (row.status !== "in_progress") throw new Error("Анкета уже завершена");
  const current = stepOf(row);
  // Answers go in order; going back is a restart, so a skipped question can never be left empty.
  if (step !== current) throw new Error("Сначала ответьте на предыдущий вопрос");

  if (step === "doctor") {
    if (typeof value !== "boolean") throw new Error("Ответьте «Да» или «Нет»");
    if (value) {
      await inTx(p, async (c) => {
        const lead = await c.query(
          `INSERT INTO leads (kind, phone, message, payload, page) VALUES ('partner_doctor', $1, $2, $3, '/partner/apply') RETURNING id`,
          [formatPhone(phone), "Врач хочет стать партнёром. Связаться и подключить к существующей программе.", JSON.stringify({ source: "partner_onboarding" })],
        );
        await c.query(`UPDATE partner_onboarding SET is_doctor = true, status = 'doctor', lead_id = $2, updated_at = now() WHERE phone = $1`, [phone, lead.rows[0].id]);
        await queueEvent(c, null, "service.doctor_lead", { phone, leadId: lead.rows[0].id });
      });
    } else {
      await p.query(`UPDATE partner_onboarding SET is_doctor = false, updated_at = now() WHERE phone = $1`, [phone]);
    }
  } else if (step === "citizen") {
    if (typeof value !== "boolean") throw new Error("Ответьте «Да» или «Нет»");
    await p.query(
      `UPDATE partner_onboarding SET citizen_rf = $2, status = CASE WHEN $2 THEN 'in_progress' ELSE 'not_citizen' END, updated_at = now() WHERE phone = $1`,
      [phone, value],
    );
  } else if (step === "form") {
    if (!isLegalForm(value)) throw new Error("Выберите ИП, самозанятый или физическое лицо");
    await p.query(`UPDATE partner_onboarding SET legal_form = $2, updated_at = now() WHERE phone = $1`, [phone, value]);
  } else if (step === "contract") {
    if (typeof value !== "boolean") throw new Error("Примите договор или откажитесь");
    if (value) {
      await p.query(`UPDATE partner_onboarding SET contract_version = $2, contract_accepted_at = now(), updated_at = now() WHERE phone = $1`, [phone, CONTRACT_VERSION]);
    } else {
      await p.query(`UPDATE partner_onboarding SET status = 'declined', updated_at = now() WHERE phone = $1`, [phone]);
    }
  } else {
    throw new Error("Неизвестный шаг анкеты");
  }
  return onboardingState(userId);
}

const DOCS = [
  ["passport_main", "Скан паспорта: страница с фото"],
  ["passport_reg", "Скан паспорта: страница с пропиской"],
  ["snils", "Скан СНИЛС"],
  ["inn", "Скан ИНН"],
] as const;
const MAX_FILE = 10 * 1024 * 1024;
const MIME = new Set(["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf"]);

export async function readUpload(form: FormData, field: string, label: string): Promise<{ data: Buffer; mime: string }> {
  const file = form.get(field);
  if (!(file instanceof Blob) || file.size === 0) throw new Error(`Приложите: ${label.toLowerCase()}`);
  if (file.size > MAX_FILE) throw new Error(`${label}: файл больше 10 МБ`);
  const mime = file.type || "application/octet-stream";
  if (!MIME.has(mime)) throw new Error(`${label}: нужен JPG, PNG, HEIC или PDF`);
  return { data: Buffer.from(await file.arrayBuffer()), mime };
}

/** The last step: personal data and scans. Creates (or refreshes) the partner card with status «Анкета». */
export async function submit(userId: string, form: FormData): Promise<OnboardingState> {
  if (!pdEnabled()) throw new Error("Приём документов временно выключен. Мы сообщим, когда можно будет продолжить");
  const p = await requirePartnerPool();
  const phone = await phoneFor(p, userId);
  const { rows } = await p.query<Row>(`SELECT * FROM partner_onboarding WHERE phone = $1`, [phone]);
  if (stepOf(rows[0]) !== "data") throw new Error("Сначала ответьте на вопросы анкеты и примите договор");
  const legalForm = rows[0].legal_form as LegalForm;
  if (form.get("consent") !== "on") throw new Error("Нужно согласие на обработку персональных данных");

  const name = v.fullName(form.get("fullName"));
  const mail = v.email(form.get("email"));
  const specialty = v.text(form.get("specialty"), 120);
  const city = v.text(form.get("city"), 120);
  const bankBik = v.bik(form.get("bik"));
  const pd = {
    passport: v.passport(form.get("passport")),
    inn: v.innPerson(form.get("inn")),
    postal: v.postal(form.get("postal")),
    bank: {
      recipient: v.text(form.get("recipient"), 160) || name,
      bik: bankBik,
      account: v.account(form.get("account"), bankBik),
      name: v.text(form.get("bankName"), 160),
    },
  };
  const files: { kind: string; data: Buffer; mime: string }[] = [];
  // Scan fields are «doc_<kind>», so «doc_inn» never collides with the ИНН number field.
  for (const [kind, label] of DOCS) files.push({ kind, ...(await readUpload(form, `doc_${kind}`, label)) });

  const hints = { passport: v.mask(pd.passport.replace(" ", "")), inn: v.mask(pd.inn), account: v.mask(pd.bank.account), bik: pd.bank.bik };
  const payoutMethod = `${LEGAL_FORMS[legalForm].short} · счёт ${hints.account}`;

  await inTx(p, async (c) => {
    const existing = await c.query(`SELECT id, status FROM partners WHERE phone = $1 FOR UPDATE`, [phone]);
    if (["approved", "certified"].includes(existing.rows[0]?.status)) throw new Error("Вы уже партнёр — войдите в кабинет");
    const values = [name, mail, specialty, city, legalForm, rows[0].contract_accepted_at, payoutMethod];
    const partnerId: string = existing.rows[0]
      ? (await c.query(
          `UPDATE partners SET full_name = $2, email = $3, specialty = $4, city = $5, legal_form = $6, contract_version = '${CONTRACT_VERSION}',
                  contract_accepted_at = $7, payout_method = $8, pd_consent_at = now(), status = 'applied', updated_at = now()
            WHERE id = $1 RETURNING id`,
          [existing.rows[0].id, ...values],
        )).rows[0].id
      : (await c.query(
          `INSERT INTO partners (phone, full_name, email, specialty, city, legal_form, contract_version, contract_accepted_at, payout_method, pd_consent_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, '${CONTRACT_VERSION}', $7, $8, now(), 'applied') RETURNING id`,
          [phone, ...values],
        )).rows[0].id;
    await c.query(
      `INSERT INTO partner_pd (partner_id, sealed, hints) VALUES ($1, $2, $3)
       ON CONFLICT (partner_id) DO UPDATE SET sealed = EXCLUDED.sealed, hints = EXCLUDED.hints, updated_at = now()`,
      [partnerId, sealJson(pd), JSON.stringify(hints)],
    );
    await c.query(`DELETE FROM partner_documents WHERE partner_id = $1 AND kind IN ('passport_main', 'passport_reg', 'snils', 'inn')`, [partnerId]);
    for (const f of files) {
      const path = await storeSealedFile(partnerId, f.data);
      await c.query(`INSERT INTO partner_documents (partner_id, kind, mime, size, path) VALUES ($1, $2, $3, $4, $5)`, [partnerId, f.kind, f.mime, f.data.length, path]);
    }
    await c.query(`UPDATE partner_onboarding SET status = 'submitted', partner_id = $2, updated_at = now() WHERE phone = $1`, [phone, partnerId]);
    // The three parallel sends of БПИТ12.8 after the personal data step.
    await queueEvent(c, partnerId, "crm.partner_created", { legalForm });
    await queueEvent(c, partnerId, "mail.accountant_new_partner", { legalForm });
    await queueEvent(c, partnerId, "mail.service_contract_copy", { legalForm, contractVersion: CONTRACT_VERSION });
  });
  return onboardingState(userId);
}
