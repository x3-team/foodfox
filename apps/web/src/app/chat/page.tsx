import { Suspense } from "react";
import ChatPageClient from "./ChatPageClient";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-fox-muted">Загрузка…</div>}>
      <ChatPageClient />
    </Suspense>
  );
}
