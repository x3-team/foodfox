import Link from "next/link";

export function LegalTabs({ current, docs }: { current: "register" | "documents"; docs: boolean }) {
  return (
    <nav className="a-tabs-inline">
      <Link href="/admin/legal" aria-current={current === "register" ? "page" : undefined}>Реестр согласий</Link>
      {docs && <Link href="/admin/legal/documents" aria-current={current === "documents" ? "page" : undefined}>Документы и версии</Link>}
    </nav>
  );
}
