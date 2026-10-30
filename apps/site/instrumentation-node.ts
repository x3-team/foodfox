import { processPending } from "./lib/admin/notify";

/* Every minute sends the events the database triggers queued. Off in `next dev` unless FOX_NOTIFY_DEV=1, so a local
   run never mails staff. */
if (process.env.DATABASE_URL && (process.env.NODE_ENV === "production" || process.env.FOX_NOTIFY_DEV === "1")) {
  const tick = () => processPending().catch((error) => console.error("[notify]", error));
  setTimeout(tick, 15_000);
  setInterval(tick, 60_000).unref();
}
