"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReportProcessingStep } from "@/lib/report-processing-steps";
import {
  DEMO_PROCESSING_STEPS,
  nextProcessingStepIndex,
  REPORT_PROCESSING_STEPS,
} from "@/lib/report-processing-steps";

const STEP_INTERVAL_MS = 1800;

interface ProcessingState {
  open: boolean;
  steps: ReportProcessingStep[];
  activeIndex: number;
  fileName?: string;
  done: boolean;
}

export function useReportProcessing() {
  const [state, setState] = useState<ProcessingState>({
    open: false,
    steps: REPORT_PROCESSING_STEPS,
    activeIndex: 0,
    done: false,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(
    (options?: { demo?: boolean; fileName?: string }) => {
      stopTimer();
      const steps = options?.demo ? DEMO_PROCESSING_STEPS : REPORT_PROCESSING_STEPS;
      setState({
        open: true,
        steps,
        activeIndex: 0,
        fileName: options?.fileName,
        done: false,
      });

      timerRef.current = setInterval(() => {
        setState((prev) => {
          if (!prev.open || prev.done) return prev;
          const next = nextProcessingStepIndex(prev.activeIndex, prev.steps.length);
          if (next === prev.activeIndex) return prev;
          return { ...prev, activeIndex: next };
        });
      }, STEP_INTERVAL_MS);
    },
    [stopTimer],
  );

  const finish = useCallback(async () => {
    stopTimer();
    setState((prev) => ({ ...prev, activeIndex: prev.steps.length - 1, done: true }));
    await new Promise((r) => setTimeout(r, 650));
    setState((prev) => ({ ...prev, open: false, done: false, activeIndex: 0 }));
  }, [stopTimer]);

  const fail = useCallback(() => {
    stopTimer();
    setState((prev) => ({ ...prev, open: false, done: false, activeIndex: 0 }));
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  return { processing: state, startProcessing: start, finishProcessing: finish, failProcessing: fail };
}
