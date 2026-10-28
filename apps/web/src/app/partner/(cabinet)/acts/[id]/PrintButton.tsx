"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="shrink-0 rounded-full bg-[#21251D] px-5 py-2.5 text-[14px] font-medium text-[#F8F9F6]">
      Печать
    </button>
  );
}
