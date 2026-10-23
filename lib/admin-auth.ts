import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

export function isAdminRequest(request: NextRequest): boolean {
  const expected = process.env.ADMIN_API_KEY;
  const authorization = request.headers.get("authorization") ?? "";
  if (!expected || !authorization.startsWith("Bearer ")) return false;
  const provided = authorization.slice(7);
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}
