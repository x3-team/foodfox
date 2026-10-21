"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULTS, PRICE_LABS_KEY, type ImageValue } from "@/lib/cms/registry";
import { LESSONS_DEFAULT, type Lesson } from "@/lib/site-data/course";
import { PARTNERS, type Partner } from "@/lib/labs";
import type { FaqGroup } from "@/lib/site-data/faq";

const Ctx = createContext<Record<string, unknown>>({});

export function ContentProvider({ values, children }: { values: Record<string, unknown>; children: React.ReactNode }) {
  return <Ctx.Provider value={values}>{children}</Ctx.Provider>;
}

/** Site texts edited in the admin, with the registry defaults behind them. */
export function useContent() {
  const values = useContext(Ctx);
  return useMemo(() => {
    const get = <T,>(key: string): T => (key in values ? values[key] : DEFAULTS[key]) as T;
    const text = (key: string) => String(get<string>(key) ?? "");
    const lines = (key: string) => text(key).split("\n").map((line) => line.trim()).filter(Boolean);
    const image = (key: string) => get<ImageValue>(key);
    const telHref = `tel:+${text("contacts.phone").replace(/\D/g, "").replace(/^8(?=\d{10}$)/, "7")}`;
    const lessons = (): Lesson[] => {
      const saved = get<Partial<Lesson>[]>("course.lessons");
      return LESSONS_DEFAULT.map((lesson, index) => ({ ...lesson, ...(saved?.[index] ?? {}) }));
    };
    const faqGroups = () => get<FaqGroup[]>("faq.groups").map((group) => ({ ...group, count: countLabel(group.items.length) }));
    const showPrices = Boolean(get<boolean>("prices.show"));
    const labPrices = get<Record<string, string>>(PRICE_LABS_KEY) ?? {};
    const labs = (): Array<Partner & { price: string }> => {
      const saved = get<Array<Partial<Partner>>>("labs.networks") ?? [];
      return PARTNERS.map((partner) => {
        const patch = saved.find((item) => item.name === partner.name) ?? {};
        return { ...partner, ...patch, price: showPrices ? (labPrices[partner.name] ?? "").trim() : "" };
      });
    };
    return { get, text, lines, image, telHref, lessons, faqGroups, labs, showPrices };
  }, [values]);
}

function countLabel(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  const word = m10 === 1 && m100 !== 11 ? "вопрос" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "вопроса" : "вопросов";
  return `${n} ${word}`;
}
