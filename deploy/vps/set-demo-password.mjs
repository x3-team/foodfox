#!/usr/bin/env node
/**
 * Set login password for demo@foodfox.local (285 antigens pre-loaded).
 * Run on VPS: node deploy/vps/set-demo-password.mjs
 */
import { scryptSync, randomBytes } from "crypto";
import pg from "pg";

const EMAIL = process.env.DEMO_EMAIL ?? "demo@foodfox.local";
const PASSWORD = process.env.DEMO_PASSWORD ?? "DemoFox2026!";
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://foodfox:foodfox_local@127.0.0.1:5433/foodfox";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const hash = hashPassword(PASSWORD);
const { rowCount } = await pool.query(
  `UPDATE users SET password_hash = $1, updated_at = now() WHERE email = $2`,
  [hash, EMAIL],
);
await pool.end();

if (!rowCount) {
  console.error(`User not found: ${EMAIL}`);
  process.exit(1);
}

console.log(`OK: ${EMAIL} password set to ${PASSWORD}`);
