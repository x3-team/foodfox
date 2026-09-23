#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { topTriggers } from "../src/lib/report-insights";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
}

test("topTriggers dedupes duplicate names", () => {
  const triggers = topTriggers([
    {
      id: "1",
      foxName: "М-трансглутаминаза мясной клей",
      valueUgMl: 48.7,
      isFloorValue: false,
      zone: "red",
    },
    {
      id: "2",
      foxName: "М-трансглутаминаза мясной клей",
      valueUgMl: 48.7,
      isFloorValue: false,
      zone: "red",
    },
    {
      id: "3",
      foxName: "Икра",
      valueUgMl: 48.7,
      isFloorValue: false,
      zone: "red",
    },
    {
      id: "4",
      foxName: "Икра",
      valueUgMl: 40,
      isFloorValue: false,
      zone: "red",
    },
    {
      id: "5",
      foxName: "Молоко коровье Bos d 4 *",
      valueUgMl: 48.4,
      isFloorValue: false,
      zone: "red",
    },
  ]);

  assert.equal(triggers.length, 3);
  assert.deepEqual(
    triggers.map((t) => t.foxName),
    ["М-трансглутаминаза мясной клей", "Икра", "Молоко коровье Bos d 4 *"],
  );
});

console.log("All report-insights tests passed.");
