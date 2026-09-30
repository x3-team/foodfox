import { PartnerShell } from "@/components/partner/PartnerShell";
import { ReportTable } from "@/components/partner/ReportTable";

export default function PartnerReportsPage() {
  return (
    <PartnerShell>
      <h1 className="text-[34px] font-light leading-[38px] tracking-[-0.5px]">
        Отчёты клиентов
      </h1>
      <p className="mt-1 text-[14px] text-[#5C5E57]">
        Номер FOX, дата теста и сверка с базой лаборатории
      </p>
      <div className="mt-6">
        <ReportTable showAllLink={false} />
      </div>
    </PartnerShell>
  );
}
