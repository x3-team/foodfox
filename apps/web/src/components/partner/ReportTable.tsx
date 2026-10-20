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
    <div className="overflow-hidden rounded-[22px] border border-[#E3E4DF] bg-white px-4 pb-3 pt-5 sm:px-6">
      <div className="flex items-center justify-between gap-3 pb-4">
        <h2 className="text-[17px] font-medium">Последние отчёты клиентов</h2>
        {showAllLink ? (
          <a href="/partner/reports" className="shrink-0 text-[14px] font-medium text-[#4A6B1F]">
            Смотреть все
          </a>
        ) : (
          <span />
        )}
      </div>
      <div className="hidden xl:grid xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,0.9fr)] xl:border-b xl:border-[#E3E4DF] xl:pb-2.5 xl:text-[12px] xl:font-medium xl:text-[#5C5E57]">
        <span>Номер отчёта</span>
        <span>Клиент</span>
        <span>Дата теста</span>
        <span>Статус</span>
        <span>Вознаграждение</span>
      </div>
      <ul className="space-y-3 xl:hidden">
        {reports.map((row) => (
          <li
            key={row.number}
            className={`rounded-2xl border border-[#E3E4DF] px-4 py-3 ${
              highlightNumber === row.number ? "bg-[#EDF3D9]/60" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 break-all text-[14px] font-medium">{row.number}</span>
              <span className={row.fee === "—" ? "shrink-0 text-[#5C5E57]" : "shrink-0 font-medium"}>
                {row.fee}
              </span>
            </div>
            <p className="mt-1 text-[14px]">
              {row.client}
              <span className="text-[#5C5E57]"> · {row.date}</span>
            </p>
            <StatusBadge status={row.status} />
          </li>
        ))}
      </ul>
      <div className="hidden xl:block">
        {reports.map((row, index) => (
          <div
            key={row.number}
            className={`grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,0.9fr)] items-center border-b border-[#E3E4DF] py-[15px] text-[14px] ${
              highlightNumber === row.number ? "bg-[#EDF3D9]/60" : ""
            }`}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <span className="min-w-0 break-all pr-3 font-medium">{row.number}</span>
            <span className="min-w-0 pr-3">{row.client}</span>
            <span className="text-[#5C5E57]">{row.date}</span>
            <span>
              <StatusBadge status={row.status} />
            </span>
            <span className={row.fee === "—" ? "text-[#5C5E57]" : "font-medium"}>
              {row.fee}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={`mt-2 inline-flex items-center gap-1.5 rounded-full py-1.5 pl-[11px] pr-[13px] text-[12px] font-medium xl:mt-0 ${badge[status]}`}
    >
      <span className={`size-[7px] rounded-full ${dot[status]}`} />
      {statusLabel[status]}
    </span>
  );
}
