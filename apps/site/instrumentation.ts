/* Starts the staff notification sender (lib/admin/notify.ts) in the Node.js server process; the edge build never
   sees it. The `if` must stay in this form: Next removes the import from the edge bundle only for this check. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
