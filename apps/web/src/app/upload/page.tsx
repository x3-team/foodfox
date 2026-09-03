"use client";

import { withBasePath } from "@/lib/base-path";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { IconFile } from "@/components/icons";
import { ReportProcessingOverlay } from "@/components/ReportProcessingOverlay";
import { useReportProcessing } from "@/lib/use-report-processing";

function goResults(
  router: ReturnType<typeof useRouter>,
  counts: { green: number; yellow: number; red: number },
  demo = false,
) {
  const q = new URLSearchParams({
    uploaded: "1",
    green: String(counts.green),
    yellow: String(counts.yellow),
    red: String(counts.red),
    ...(demo ? { demo: "1" } : {}),
  });
  router.push(`/results?${q.toString()}`);
}

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { processing, startProcessing, finishProcessing, failProcessing } = useReportProcessing();

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Нужен PDF-файл FOX");
        return;
      }
      setLoading(true);
      setError(null);
      startProcessing({ fileName: file.name });
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch(withBasePath("/api/reports/upload"), { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Ошибка загрузки");
        await finishProcessing();
        goResults(router, data.counts ?? { green: 0, yellow: 0, red: 0 });
      } catch (e) {
        failProcessing();
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    },
    [router, startProcessing, finishProcessing, failProcessing],
  );

  const loadDemo = async () => {
    setLoading(true);
    setError(null);
    startProcessing({ demo: true, fileName: "Демо FOX · 285 антигенов" });
    try {
      const res = await fetch(withBasePath("/api/demo/load-sample"), { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка демо");
      await finishProcessing();
      goResults(router, data.counts ?? { green: 0, yellow: 0, red: 0 }, true);
    } catch (e) {
      failProcessing();
      setError(e instanceof Error ? e.message : "Ошибка демо");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <AppShell>
      {processing.open && (
        <ReportProcessingOverlay
          steps={processing.steps}
          activeIndex={processing.activeIndex}
          fileName={processing.fileName}
          done={processing.done}
        />
      )}
      <PageHeader
        title="Загрузка отчёта"
        subtitle="Загрузите PDF FOX Food Xplorer — мы разберём 286 антигенов"
      />
      <main className="flex flex-1 flex-col gap-5 px-5 pb-6 pt-6">
        <label
          htmlFor="pdf-input"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`fox-card flex cursor-pointer flex-col items-center gap-4 border-2 border-dashed px-6 py-10 transition ${
            dragging
              ? "border-fox-primary bg-fox-primary-soft"
              : "border-fox-primary-muted hover:border-fox-primary"
          } ${loading ? "pointer-events-none opacity-60" : ""}`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-fox-primary-soft text-fox-primary">
            <IconFile className="h-8 w-8" />
          </div>
          <div className="text-center">
            <p className="text-[17px] font-semibold text-fox-text">Перетащите PDF сюда</p>
            <p className="mt-1 text-[14px] leading-relaxed text-fox-muted">
              или нажмите, чтобы выбрать файл на устройстве
            </p>
          </div>
          <input
            id="pdf-input"
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />
        </label>

        <div className="fox-card space-y-2 px-4 py-3.5">
          <p className="text-[13px] font-medium text-fox-text">FOX Food Xplorer</p>
          <p className="text-[13px] leading-relaxed text-fox-muted">
            IgG-анализ 286 пищевых антигенов. Результаты носят информационный характер и не
            заменяют консультацию врача.
          </p>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-fox-red">{error}</p>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={() => document.getElementById("pdf-input")?.click()}
          className="fox-btn-primary w-full"
        >
          {loading ? "Обрабатываем…" : "Загрузить отчёт"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={loadDemo}
          className="w-full rounded-xl border border-fox-primary/30 bg-fox-primary-soft py-3.5 text-[15px] font-semibold text-fox-primary transition hover:bg-fox-primary/10 disabled:opacity-50"
        >
          Загрузить демо-отчёт (285 антигенов)
        </button>
        <p className="text-center text-[12px] leading-relaxed text-fox-muted">
          Для презентации: мгновенно создаст план и чат без PDF
        </p>
      </main>
    </AppShell>
  );
}
