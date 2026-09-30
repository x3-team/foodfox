import {
  reports,
  statusLabel,
  type ReportStatus,
} from "@/lib/partner-demo";

const badge: Record<ReportStatus, string> = {
  credited: "bg-[#EDF3D9] text-[#4A6B1F]",
  review: "bg-[#FBF0D8] text-[#8A6416]",
  missing: "bg-[#F8E3DE] text-[#A03A22]",
};

const dot: Record<ReportStatus, string> = {
  credited: "bg-[#4A6B1F]",
  review: "bg-[#8A6416]",
  missing: "bg-[#A03A22]",
};

export function ReportTable({
  highlightNumber,
  showAllLink = true,
}: {
  highlightNumber?: string;
  showAllLink?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#E3E4DF] bg-white px-6 pb-3 pt-5">
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-[17px] font-medium">Последние отчёты клиентов</h2>
        {showAllLink ? (
          <a href="/partner/reports" className="text-[14px] font-medium text-[#4A6B1F]">
            Смотреть все
          </a>
        ) : (
          <span />
        )}
      </div>
      <div className="grid grid-cols-[220px_200px_140px_210px_1fr] border-b border-[#E3E4DF] pb-2.5 text-[12px] font-medium text-[#5C5E57]">
        <span>Номер отчёта</span>
        <span>Клиент</span>
        <span>Дата теста</span>
        <span>Статус</span>
        <span>Вознаграждение</span>
      </div>
      {reports.map((row, index) => (
        <div
          key={row.number}
          className={`grid grid-cols-[220px_200px_140px_210px_1fr] items-center border-b border-[#E3E4DF] py-[15px] text-[14px] ${
            highlightNumber === row.number ? "bg-[#EDF3D9]/60" : ""
          }`}
          style={{ animationDelay: `${index * 30}ms` }}
        >
          <span className="font-medium">{row.number}</span>
          <span>{row.client}</span>
          <span className="text-[#5C5E57]">{row.date}</span>
          <span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full py-1.5 pl-[11px] pr-[13px] text-[12px] font-medium ${badge[row.status]}`}
            >
              <span className={`size-[7px] rounded-full ${dot[row.status]}`} />
              {statusLabel[row.status]}
            </span>
          </span>
          <span className={row.fee === "—" ? "text-[#5C5E57]" : "font-medium"}>
            {row.fee}
          </span>
        </div>
      ))}
    </div>
  );
}
