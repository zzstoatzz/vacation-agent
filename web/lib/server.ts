import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { Client } from "@langchain/langgraph-sdk";

export const apiUrl =
  process.env.LANGGRAPH_API_URL ??
  "https://vacation-agent-a9855629615a52f0ae427812f8a13c65.us.langgraph.app";
const cookieName = "away_session";
const buckets = new Map<string, { count: number; expires: number }>();

function signingKey() {
  const key = process.env.SESSION_SECRET;
  if (!key) throw new Error("Session secret is not configured");
  return key;
}

export function equal(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function sign(value: string) {
  return createHmac("sha256", signingKey()).update(value).digest("hex");
}

export async function session() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value) return null;
  const [id, expiry, signature] = value.split(".");
  if (!id || !expiry || !signature || !/^\d+$/.test(expiry)) return null;
  if (Number(expiry) < Date.now() || !equal(sign(`${id}.${expiry}`), signature))
    return null;
  return id;
}

export async function startSession() {
  const id = randomUUID();
  const value = `${id}.${Date.now() + 7 * 86400_000}`;
  (await cookies()).set(cookieName, `${value}.${sign(value)}`, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 86400,
  });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN ?? "http://localhost:3007";
  return origin === expected;
}

export function allow(key: string, limit: number, windowMs = 3600_000) {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.expires < now) buckets.delete(k);
  const bucket = buckets.get(key) ?? { count: 0, expires: now + windowMs };
  bucket.count++;
  buckets.set(key, bucket);
  return bucket.count <= limit;
}

export function client() {
  return new Client({ apiUrl, apiKey: process.env.LANGSMITH_API_KEY });
}

export async function body(request: Request) {
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    length += result.value.length;
    if (length > 16_384) {
      await reader.cancel();
      throw new Error("Request too large");
    }
    chunks.push(result.value);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(text || "{}");
}
