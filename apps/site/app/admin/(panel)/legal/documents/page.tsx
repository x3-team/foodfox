import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { DOC_KINDS, listDocuments } from "@/lib/admin/consents";
import { LegalTabs } from "../Tabs";
import { DocumentsEditor } from "./DocumentsEditor";

export const metadata: Metadata = { title: "Правовые документы" };

export default async function DocumentsPage() {
  await requireStaff("legal");
  const docs = await listDocuments();
  return (
    <>
      <div className="a-head">
        <div>
          <h1>Документы и согласия</h1>
          <p>Версии политики, согласия на обработку данных, оферты и согласия на рассылки. Новые согласия записываются на действующую версию; старые версии остаются в истории вместе с теми, кто их принял.</p>
        </div>
      </div>
      <LegalTabs current="documents" docs />
      <DocumentsEditor
        kinds={Object.entries(DOC_KINDS).map(([id, label]) => ({ id, label }))}
        docs={docs.map((d) => ({
          id: d.id, kind: d.kind, kindLabel: DOC_KINDS[d.kind], version: d.version, title: d.title, url: d.url, note: d.note,
          effectiveFrom: new Date(d.effective_from).toISOString().slice(0, 10), current: d.is_current, accepted: d.accepted ?? 0,
        }))}
      />
    </>
  );
}
