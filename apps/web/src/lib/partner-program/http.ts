import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, handleAuthError } from "@/lib/api-auth";
import type { SessionData } from "@/lib/auth";
import { activePartnerId, requirePartnerPool } from "./db";

/* Route handlers of the partner program answer {error} with a message the form can show as is. */

type Handler<T> = (session: SessionData, req: NextRequest) => Promise<T>;

export function json<T>(handler: Handler<T>) {
  return async (req: NextRequest) => {
    try {
      const session = await getAuthSession(req);
      return NextResponse.json(await handler(session, req));
    } catch (error) {
      const auth = handleAuthError(error);
      if (auth) return auth;
      // Database, file system and other library errors carry a `code`; only our own messages reach the form.
      if (!(error instanceof Error) || "code" in error || error.name !== "Error") {
        console.error("[partner-program]", error);
        return NextResponse.json({ error: "Сервис временно недоступен" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  };
}

/** The approved partner behind a cabinet session, or an error the cabinet shows. */
export async function cabinetPartner(session: SessionData): Promise<string> {
  if (session.role !== "partner") throw new Error("Войдите в кабинет партнёра");
  const id = await activePartnerId(await requirePartnerPool(), session.userId);
  if (!id) throw new Error("Это действие доступно после одобрения договора");
  return id;
}
