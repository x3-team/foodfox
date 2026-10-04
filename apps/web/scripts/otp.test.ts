#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  demoCodeFor,
  isPartnerDemoPhone,
  normalizePhone,
  otpRequestPayload,
} from "../src/lib/otp";

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

test("partner demo uses its own code and is not the client number", () => {
  const savedPhone = process.env.FOX_PARTNER_DEMO_PHONE;
  const savedOtp = process.env.FOX_PARTNER_DEMO_OTP;
  delete process.env.FOX_PARTNER_DEMO_PHONE;
  delete process.env.FOX_PARTNER_DEMO_OTP;
  try {
    withEnv(
      { FOX_DEMO_PHONES: "79251111111,79991234567", FOX_DEMO_OTP: "1111" },
      () => {
        assert.equal(demoCodeFor("79990001122"), "2026");
        assert.equal(isPartnerDemoPhone("79990001122"), true);
        assert.equal(demoCodeFor("79251111111"), "1111");
        assert.equal(isPartnerDemoPhone("79251111111"), false);
        assert.equal(demoCodeFor("79000000001"), null);
      },
    );
  } finally {
    if (savedPhone === undefined) delete process.env.FOX_PARTNER_DEMO_PHONE;
    else process.env.FOX_PARTNER_DEMO_PHONE = savedPhone;
    if (savedOtp === undefined) delete process.env.FOX_PARTNER_DEMO_OTP;
    else process.env.FOX_PARTNER_DEMO_OTP = savedOtp;
  }
});

test("otp response includes demoCode only for demo numbers", () => {
  const hidden = otpRequestPayload("79000000001", 42000, null);
  assert.equal("demoCode" in hidden, false);
  const partner = otpRequestPayload("79990001122", 42000, "2026");
  assert.equal(partner.demoCode, "2026");
  const client = otpRequestPayload("79251111111", 42000, "1111");
  assert.equal(client.demoCode, "1111");
});

console.log("\nAll OTP tests passed.");
