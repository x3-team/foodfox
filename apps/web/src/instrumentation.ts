/**
 * Errors that escape every route handler: a promise nobody awaited, or a throw
 * in a timer. Route handlers report their own failures (lib/monitoring.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportServerError } = await import("./lib/monitoring");
  process.on("unhandledRejection", (reason) => {
    reportServerError(reason, {
      route: "process",
      tags: { kind: "unhandledRejection" },
    });
  });
  process.on("uncaughtExceptionMonitor", (error) => {
    reportServerError(error, {
      route: "process",
      tags: { kind: "uncaughtException" },
    });
  });
}
