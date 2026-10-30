"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "@/components/admin/Icon";
import { deletePartner } from "../actions";

export function PartnerDelete({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="a-btn is-danger is-small"
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Удалить анкету «${name}» насовсем? Личные данные и сканы будут стёрты, это попадёт в журнал.`)) return;
        start(async () => {
          const r = await deletePartner(id);
          if (!r.ok) { window.alert(r.message); return; }
          router.push("/admin/partners?tab=applications");
        });
      }}
    >
      <Icon name="trash" size={16} /> Удалить анкету
    </button>
  );
}
