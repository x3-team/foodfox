"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, Header } from "@/components/AppShell";

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Нужен PDF-файл FOX");
        return;
      }
      setLoading(true);
      setError(null);
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/reports/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Ошибка загрузки");
        router.push("/results");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <AppShell>
      <Header title="Загрузка отчёта" />
      <main className="flex flex-1 flex-col gap-6 px-5 pt-8">
        <label
          htmlFor="pdf-input"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed bg-white px-6 py-12 transition-colors ${
            dragging ? "border-fox-primary bg-fox-reminder" : "border-fox-primary-light"
          }`}
        >
          <span className="text-5xl">📄</span>
          <p className="text-lg font-semibold text-fox-text">Перетащите PDF FOX</p>
          <p className="text-sm text-fox-muted">или нажмите для выбора файла</p>
          <input
            id="pdf-input"
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />
        </label>
        <p className="text-[13px] text-fox-muted">FOX Food Xplorer — 286 IgG антигенов</p>
        <p className="text-xs text-fox-muted">IgG ≠ диагноз. Рекомендации информационные.</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="button"
          disabled={loading}
          onClick={() => document.getElementById("pdf-input")?.click()}
          className="rounded-xl bg-fox-primary px-6 py-4 text-center text-base font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Парсим отчёт…" : "Загрузить отчёт"}
        </button>
      </main>
    </AppShell>
  );
}
