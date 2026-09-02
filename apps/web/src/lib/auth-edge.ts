export const SESSION_COOKIE = "fox_session";

export interface SessionData {
  userId: string;
  clientId: string;
  email: string;
  displayName: string;
}

function getSecret(): string {
  return (
    process.env.SESSION_SECRET ??
    process.env.FOX_SESSION_SECRET ??
    "foodfox-dev-session-change-in-production"
  );
}

function base64UrlToBytes(b64: string): Uint8Array {
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const b64std = b64.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64std);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function decodeSession(token: string): Promise<SessionData | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const expected = bytesToBase64Url(mac);
  if (sig.length !== expected.length || sig !== expected) return null;

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(body));
    return JSON.parse(json) as SessionData;
  } catch {
    return null;
  }
}
