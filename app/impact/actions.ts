"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { newSessionToken } from "@/lib/impact/auth";
import { SESSION_COOKIE, SESSION_HOURS } from "@/lib/impact/constants";
import { authenticateUser, createSession, getDb, writeAudit } from "@/lib/impact/db";
import { endSession } from "@/lib/impact/session";

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const db = getDb();
  const now = new Date().toISOString();
  const principal = authenticateUser(db, email, password);
  if (!principal) {
    writeAudit(db, "anonymous", "login_failed", "rejected", now);
    redirect("/impact/login?error=1");
  }
  const token = newSessionToken();
  createSession(db, principal.userId, token, now);
  writeAudit(db, principal.userId, "login", principal.role, now);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_HOURS * 60 * 60,
  });
  redirect("/impact");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/impact/login");
}
