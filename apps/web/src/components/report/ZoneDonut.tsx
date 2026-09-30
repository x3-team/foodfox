import type { Zone } from "@/lib/fox-parser";

export const ZONE_HEX: Record<Zone, string> = {
  green: "#059669",
  yellow: "#D97706",
  red: "#DC2626",
};

interface ZoneDonutProps {
  counts: Record<Zone, number>;
  size?: number;
  strokeWidth?: number;
}

const ORDER: Zone[] = ["green", "yellow", "red"];

export function ZoneDonut({ counts, size = 132, strokeWidth = 14 }: ZoneDonutProps) {
  const total = ORDER.reduce((sum, z) => sum + counts[z], 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = ORDER.map((zone) => {
    const value = counts[zone];
    const fraction = total > 0 ? value / total : 0;
    const arc = {
      zone,
      dash: fraction * circumference,
      offset,
    };
    offset += fraction * circumference;
    return arc;
  }).filter((a) => a.dash > 0);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#EEF2EC"
            strokeWidth={strokeWidth}
          />
          {arcs.map((arc) => (
            <circle
              key={arc.zone}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ZONE_HEX[arc.zone]}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(arc.dash - 3, 0)} ${circumference}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-bold leading-none tracking-tight text-fox-text">
          {total}
        </span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-fox-muted">
          антигенов
        </span>
      </div>
    </div>
  );
}
