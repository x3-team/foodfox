import type { Zone } from "@/lib/fox-parser";

const ZONE_STYLES: Record<
  Zone,
  { dot: string; active: string; inactive: string; label: string }
> = {
  green: {
    dot: "bg-fox-green",
    active: "bg-fox-green text-white shadow-sm",
    inactive: "bg-fox-surface text-fox-text ring-1 ring-fox-border",
    label: "Зелёные",
  },
  yellow: {
    dot: "bg-fox-yellow",
    active: "bg-fox-yellow text-white shadow-sm",
    inactive: "bg-fox-surface text-fox-text ring-1 ring-fox-border",
    label: "Жёлтые",
  },
  red: {
    dot: "bg-fox-red",
    active: "bg-fox-red text-white shadow-sm",
    inactive: "bg-fox-surface text-fox-text ring-1 ring-fox-border",
    label: "Красные",
  },
};

export function ZoneTabs({
  active,
  counts,
  onChange,
}: {
  active: Zone;
  counts: Record<Zone, number>;
  onChange: (z: Zone) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(["green", "yellow", "red"] as Zone[]).map((zone) => {
        const s = ZONE_STYLES[zone];
        const isActive = active === zone;
        return (
          <button
            key={zone}
            type="button"
            onClick={() => onChange(zone)}
            className={`flex flex-col items-center rounded-2xl px-2 py-3 text-center transition ${
              isActive ? s.active : s.inactive
            }`}
          >
            <span className={`mb-1.5 h-2 w-2 rounded-full ${isActive ? "bg-white/90" : s.dot}`} />
            <span className="text-[12px] font-semibold leading-tight">{s.label}</span>
            <span className={`mt-0.5 text-[18px] font-bold leading-none ${isActive ? "" : "text-fox-text"}`}>
              {counts[zone]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ZoneDot({ zone }: { zone: Zone }) {
  const color =
    zone === "green" ? "bg-fox-green" : zone === "yellow" ? "bg-fox-yellow" : "bg-fox-red";
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color}`} aria-hidden />;
}
