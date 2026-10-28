import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidSessionToken } from "./auth-token";

export const ADMIN_COOKIE = "meme_admin";

export function getAuthSecret() {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "local-development-only";
}

export async function isAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return isValidSessionToken(token, getAuthSecret());
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
