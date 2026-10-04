import { PartnerShell } from "@/components/partner/PartnerShell";
import { ReportTable } from "@/components/partner/ReportTable";

export default function PartnerReportsPage() {
  return (
    <PartnerShell>
      <h1 className="text-[28px] font-light leading-8 tracking-[-0.5px] sm:text-[34px] sm:leading-[38px]">
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
