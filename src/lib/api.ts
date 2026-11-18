import "server-only";
import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "./rate-limit";

export function jsonError(status: number, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

/** Parses a JSON body with a size cap. Returns null on failure. */
export async function readJson(request: Request, maxBytes = 32_000): Promise<unknown | null> {
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > maxBytes) return null;
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function limited(request: Request, name: string, limit: number, windowMs = 60_000): boolean {
  return !rateLimit(`${name}:${clientIp(request)}`, limit, windowMs);
}
