#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { demoCodeFor, normalizePhone } from "../src/lib/otp";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
}

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    fn();
  } finally {
    process.env = saved;
  }
}

test("normalizePhone accepts the shapes people type", () => {
  for (const raw of [
    "79251111111",
    "89251111111",
    "+79251111111",
    "+7 925 111-11-11",
    "8 (925) 111 11 11",
    "9251111111",
  ]) {
    assert.equal(normalizePhone(raw), "79251111111", raw);
  }
  assert.equal(normalizePhone("12345"), null);
});

test("demo list tolerates the plus operators actually write in .env", () => {
  withEnv(
    { FOX_DEMO_PHONES: "+79251111111,+79991234567", FOX_DEMO_OTP: "1111" },
    () => {
      assert.equal(demoCodeFor("79251111111"), "1111");
      assert.equal(demoCodeFor("79991234567"), "1111");
      assert.equal(demoCodeFor("79990000000"), null);
    },
  );
});

test("demo list tolerates spacing and 8-prefixed entries", () => {
  withEnv(
    { FOX_DEMO_PHONES: " 8 (925) 111-11-11 , +7 999 123 45 67 ", FOX_DEMO_OTP: "4747" },
    () => {
      assert.equal(demoCodeFor("79251111111"), "4747");
      assert.equal(demoCodeFor("79991234567"), "4747");
    },
  );
});

test("garbage entries are dropped instead of matching everything", () => {
  withEnv({ FOX_DEMO_PHONES: "not-a-phone,,+79251111111" }, () => {
    assert.equal(demoCodeFor("79251111111"), "1111");
    assert.equal(demoCodeFor("79991234567"), null);
  });
});

console.log("\nAll OTP tests passed.");
