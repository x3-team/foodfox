"use client";

import { createContext, useContext } from "react";
import type { PartnerData } from "@/lib/partner-data";
import * as demo from "@/lib/partner-demo";

const Ctx = createContext<PartnerData>({ source: "demo", partner: demo.partner, reports: demo.reports, payouts: demo.payouts, kpis: demo.kpis, money: demo.money, fee: 2400, statements: demo.statements });

export function PartnerDataProvider({ value, children }: { value: PartnerData; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePartnerData(): PartnerData {
  return useContext(Ctx);
}
