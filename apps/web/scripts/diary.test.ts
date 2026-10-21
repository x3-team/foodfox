#!/usr/bin/env npx tsx
/**
 * Symptom diary: input rules, zone link, encryption, and a save → read →
 * delete round trip against the in-memory store, or against Postgres when
 * DIARY_TEST_DATABASE_URL points at a scratch database (it applies the schema).
 * Run: npm run diary:test
 */
import assert from "node:assert/strict";
import {
  annotateFoods,
  checkEntryDate,
  diaryAad,
  parseDiaryInput,
} from "../src/lib/diary";
import {
  HealthKeyMissingError,
  decryptHealth,
  encryptHealth,
  resetHealthKeyForTests,
} from "../src/lib/health-crypto";

const results: { name: string; fn: () => void | Promise<void> }[] = [];
function test(name: string, fn: () => void | Promise<void>) {
  results.push({ name, fn });
}

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const saved = { ...process.env };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  resetHealthKeyForTests();
  try {
    fn();
  } finally {
    process.env = saved;
    resetHealthKeyForTests();
  }
}

const TODAY = "2026-10-21";

test("a full entry passes and comes out ordered and trimmed", () => {
  const r = parseDiaryInput(
    {
      date: TODAY,
      wellbeing: "so_so",
      symptoms: ["sleep", "bloating", "sleep"],
      note: "  вздутие   вечером \n\n\n\nпосле ужина ",
      foods: [" Гречка ", "гречка", "Кефир", ""],
    },
    TODAY,
  );
  assert.ok(r.ok);
  assert.deepEqual(r.value.symptoms, ["bloating", "sleep"]);
  assert.equal(r.value.note, "вздутие вечером \n\nпосле ужина");
  assert.deepEqual(r.value.foods, ["Гречка", "Кефир"]);
});

test("note and foods are optional", () => {
  const r = parseDiaryInput({ date: TODAY, wellbeing: "good" }, TODAY);
  assert.ok(r.ok);
  assert.deepEqual(r.value.symptoms, []);
  assert.equal(r.value.note, null);
  assert.deepEqual(r.value.foods, []);
});

test("unknown wellbeing or symptom is refused", () => {
  assert.equal(parseDiaryInput({ date: TODAY, wellbeing: "great" }, TODAY).ok, false);
  assert.equal(
    parseDiaryInput({ date: TODAY, wellbeing: "good", symptoms: ["headache"] }, TODAY).ok,
    false,
  );
});

test("long note and too many foods are refused", () => {
  assert.equal(
    parseDiaryInput({ date: TODAY, wellbeing: "good", note: "a".repeat(501) }, TODAY).ok,
    false,
  );
  const foods = Array.from({ length: 21 }, (_, i) => `еда ${i}`);
  assert.equal(parseDiaryInput({ date: TODAY, wellbeing: "good", foods }, TODAY).ok, false);
});

test("dates: tomorrow (Moscow is ahead of UTC) yes, later no, 30 days back yes, 31 no", () => {
  assert.ok(checkEntryDate("2026-10-22", TODAY).ok);
  assert.equal(checkEntryDate("2026-10-23", TODAY).ok, false);
  assert.ok(checkEntryDate("2026-09-21", TODAY).ok);
  assert.equal(checkEntryDate("2026-09-20", TODAY).ok, false);
  assert.equal(checkEntryDate("2026-02-30", TODAY).ok, false);
  assert.equal(checkEntryDate("21.10.2026", TODAY).ok, false);
});

test("foods get the client's own zone by exact name, unknown ones none", () => {
  const foods = annotateFoods(
    ["молоко коровье", "Ёжевика", "сыр"],
    [
      { foxName: "Молоко коровье", zone: "red" },
      { foxName: "Ежевика", zone: "green" },
      { foxName: "Сыр козий", zone: "yellow" },
    ],
  );
  assert.deepEqual(foods, [
    { name: "молоко коровье", zone: "red" },
    { name: "Ёжевика", zone: "green" },
    { name: "сыр", zone: null },
  ]);
});

test("ciphertext opens only for its own client and day", () => {
  withEnv({ FOX_HEALTH_DATA_KEY: Buffer.alloc(32, 7).toString("base64") }, () => {
    const payload = { wellbeing: "bad", note: "вздутие" };
    const sealed = encryptHealth(payload, diaryAad("c1", TODAY));
    assert.match(sealed, /^v1:/);
    assert.ok(!sealed.includes("вздутие"));
    assert.notEqual(sealed, encryptHealth(payload, diaryAad("c1", TODAY)), "fresh IV");
    assert.deepEqual(decryptHealth(sealed, diaryAad("c1", TODAY)), payload);
    assert.throws(() => decryptHealth(sealed, diaryAad("c2", TODAY)));
    assert.throws(() => decryptHealth(sealed, diaryAad("c1", "2026-10-20")));
  });
});

test("another key cannot open it", () => {
  let sealed = "";
  withEnv({ FOX_HEALTH_DATA_KEY: Buffer.alloc(32, 1).toString("base64") }, () => {
    sealed = encryptHealth({ a: 1 }, "x");
  });
  withEnv({ FOX_HEALTH_DATA_KEY: "ab".repeat(32) }, () => {
    assert.throws(() => decryptHealth(sealed, "x"));
  });
});

test("production without a key refuses instead of falling back", () => {
  withEnv({ NODE_ENV: "production", FOX_HEALTH_DATA_KEY: undefined }, () => {
    assert.throws(() => encryptHealth({}, "x"), HealthKeyMissingError);
  });
  withEnv({ FOX_HEALTH_DATA_KEY: "too-short" }, () => {
    assert.throws(() => encryptHealth({}, "x"), /32 bytes/);
  });
});

test("store: save, read back with zones and phase, delete", async () => {
  const pgUrl = process.env.DIARY_TEST_DATABASE_URL;
  if (pgUrl) process.env.DATABASE_URL = pgUrl;
  else delete process.env.DATABASE_URL;
  const { getOrCreateDemoClient, getChatMessages, loadDemoReport } = await import(
    "../src/lib/db"
  );
  const { getDiary, saveDiaryEntry, deleteDiaryEntry } = await import("../src/lib/diary-store");
  const { memoryDiary } = await import("../src/lib/diary-memory");
  const clientId = await getOrCreateDemoClient();
  const empty = await getDiary(clientId, 30);
  assert.equal(empty.context.hasPlan, false, "no report yet, no plan");
  await loadDemoReport(clientId);
  const today = new Date().toISOString().slice(0, 10);

  const before = await getDiary(clientId, 30);
  assert.equal(before.entries.length, 0);
  assert.ok(before.context.hasPlan);
  assert.ok(before.context.foodSuggestions.length > 0);

  // No entry today: the assistant nudges once.
  let chat = await getChatMessages(clientId);
  assert.equal(chat.filter((m) => m.messageType === "diary_reminder").length, 1);
  chat = await getChatMessages(clientId);
  assert.equal(chat.filter((m) => m.messageType === "diary_reminder").length, 1);

  const food = before.context.foodSuggestions[0];
  const saved = await saveDiaryEntry(clientId, {
    date: today,
    wellbeing: "so_so",
    symptoms: ["bloating"],
    note: "вздутие вечером",
    foods: [food, "что-то своё"],
  });
  assert.equal(saved.wellbeing, "so_so");
  assert.equal(saved.foods[0].zone, "green");
  assert.equal(saved.foods[1].zone, null);
  assert.ok(saved.weekNumber && saved.phase);

  let stored: string;
  if (pgUrl) {
    const { getDbPool } = await import("../src/lib/db");
    const { rows } = await getDbPool()!.query(
      "SELECT payload FROM diary_entries WHERE client_id = $1",
      [clientId],
    );
    stored = rows[0].payload;
  } else {
    stored = Array.from(memoryDiary.values())[0].payload;
  }
  assert.match(stored, /^v1:/);
  assert.ok(!stored.includes("вздутие"), "stored encrypted");

  const after = await getDiary(clientId, 30);
  assert.equal(after.entries.length, 1);
  assert.equal(after.entries[0].note, "вздутие вечером");

  // Re-saving the day replaces it.
  await saveDiaryEntry(clientId, {
    date: today,
    wellbeing: "good",
    symptoms: [],
    note: null,
    foods: [],
  });
  const replaced = await getDiary(clientId, 30);
  assert.equal(replaced.entries.length, 1);
  assert.equal(replaced.entries[0].wellbeing, "good");

  assert.equal(await deleteDiaryEntry(clientId, today), true);
  assert.equal((await getDiary(clientId, 30)).entries.length, 0);
});

(async () => {
  let failed = 0;
  for (const t of results) {
    try {
      await t.fn();
      console.log(`✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`✗ ${t.name}`);
      console.error(e);
    }
  }
  if (process.env.DIARY_TEST_DATABASE_URL) {
    const { getDbPool } = await import("../src/lib/db");
    await getDbPool()?.end();
  }
  if (failed) process.exit(1);
})();
