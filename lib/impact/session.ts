import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/impact/constants";
import { deleteSession, getDb, principalForToken } from "@/lib/impact/db";
import type { Principal } from "@/lib/impact/types";

export async function readPrincipal(): Promise<Principal | null> {
  await connection();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return principalForToken(getDb(), token, new Date().toISOString());
}

export async function requirePrincipal(): Promise<Principal> {
  const principal = await readPrincipal();
  if (!principal) redirect("/impact/login");
  return principal;
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(getDb(), token);
  jar.delete(SESSION_COOKIE);
}
