"use client";

import { FoxLogo } from "@/components/icons";
import type { ReportProcessingStep } from "@/lib/report-processing-steps";

interface ReportProcessingOverlayProps {
  steps: ReportProcessingStep[];
  activeIndex: number;
  fileName?: string;
  done?: boolean;
}

function StepIcon({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fox-primary text-white">
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8.5 6.5 12 13 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-fox-primary/25" />
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-fox-primary bg-fox-primary-soft">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-fox-primary" />
        </span>
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-fox-border bg-fox-bg">
      <span className="h-2 w-2 rounded-full bg-fox-border" />
    </span>
  );
}

export function ReportProcessingOverlay({
  steps,
  activeIndex,
  fileName,
  done = false,
}: ReportProcessingOverlayProps) {
  const progress = done ? 100 : Math.round(((activeIndex + 0.35) / steps.length) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-processing-title"
      aria-busy={!done}
    >
      <div className="fox-card w-full max-w-phone animate-[slideUp_0.35s_ease-out] px-5 py-6 shadow-lg">
        <div className="mb-5 flex items-center gap-3">
          <div className="relative">
            <FoxLogo
              className={`text-4xl ${done ? "" : "animate-[gentleSpin_2.4s_linear_infinite]"}`}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="report-processing-title" className="text-[17px] font-semibold text-fox-text">
              {done ? "Отчёт готов!" : "Обрабатываем отчёт FOX"}
            </h2>
            <p className="truncate text-[13px] text-fox-muted">
              {fileName ? fileName : "Это займёт несколько секунд"}
            </p>
          </div>
        </div>

        <div className="mb-5">
          <div className="mb-1.5 flex justify-between text-[11px] font-medium text-fox-muted">
            <span>Прогресс</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-fox-border/60">
            <div
              className="h-full rounded-full bg-fox-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <ol className="space-y-3">
          {steps.map((step, index) => {
            const state = done || index < activeIndex
              ? "done"
              : index === activeIndex
                ? "active"
                : "pending";
            return (
              <li key={step.id} className="flex gap-3">
                <StepIcon state={state} />
                <div className="min-w-0 pt-0.5">
                  <p
                    className={`text-[14px] font-medium leading-snug ${
                      state === "pending" ? "text-fox-muted" : "text-fox-text"
                    }`}
                  >
                    {step.label}
                  </p>
                  {(state === "active" || state === "done") && (
                    <p className="mt-0.5 text-[12px] leading-relaxed text-fox-muted">{step.detail}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
