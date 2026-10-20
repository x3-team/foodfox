/**
 * TEMPORARY: demo auto-login for the partner cabinet (/partner).
 *
 * With the flag on, an unauthenticated visit to /partner fills in the partner
 * demo phone and code and signs in on its own. To remove the feature, delete
 * this file and its usages (grep PARTNER_DEMO_AUTOLOGIN).
 *
 * Off switch without code changes: NEXT_PUBLIC_PARTNER_DEMO_AUTOLOGIN=0 (or
 * "false") in apps/web/.env, then rebuild — NEXT_PUBLIC_* is inlined at build.
 * One visit without it: open /partner?manual=1 (logout goes there too).
 *
 * The phone and code must match the server's partner demo account
 * (lib/otp.ts: FOX_PARTNER_DEMO_PHONE / FOX_DEMO_OTP defaults). If the
 * server overrides them, auto-login fails and the form stays usable by hand.
 */
const flag = (process.env.NEXT_PUBLIC_PARTNER_DEMO_AUTOLOGIN ?? "").trim().toLowerCase();

export const PARTNER_DEMO_AUTOLOGIN = !["0", "false", "no", "off"].includes(flag);
export const PARTNER_DEMO_AUTOLOGIN_PHONE = "79251111111";
export const PARTNER_DEMO_AUTOLOGIN_CODE = "1111";
