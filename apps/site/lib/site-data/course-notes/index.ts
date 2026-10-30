/* Lesson texts from the client's notes, one module per lesson so the lessons page loads only the one it shows (they
   are ~260 KB together and must not land in the shared bundle through the admin defaults). Keys: "1"…"6", and
   "5-1"…"5-4" for the parts of lesson 5. Lesson 3 has no notes yet. */
export const NOTES: Record<string, () => Promise<{ default: string }>> = {
  "1": () => import("./lesson-1"),
  "2": () => import("./lesson-2"),
  "4": () => import("./lesson-4"),
  "5-1": () => import("./lesson-5-1"),
  "5-2": () => import("./lesson-5-2"),
  "5-3": () => import("./lesson-5-3"),
  "5-4": () => import("./lesson-5-4"),
  "6": () => import("./lesson-6"),
};
