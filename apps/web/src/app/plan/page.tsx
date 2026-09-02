import { Suspense } from "react";
import PlanPageClient from "./PlanPageClient";

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-fox-muted">Загрузка…</div>}>
      <PlanPageClient />
    </Suspense>
  );
}
