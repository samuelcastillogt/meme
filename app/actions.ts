"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, getAuthSecret, requireAdmin } from "@/lib/auth";
import { createSessionToken } from "@/lib/auth-token";
import { deleteMeme, updateMeme } from "@/lib/db";
import { startScraper, type ScraperMode } from "@/lib/scraper";

function sameValue(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  const configuredPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "development" ? "admin" : "");
  if (!configuredPassword || !sameValue(password, configuredPassword)) redirect("/admin/login?error=1");

  (await cookies()).set(ADMIN_COOKIE, createSessionToken(getAuthSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  redirect("/admin");
}

export async function logoutAction() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function updateMemeAction(slug: string, formData: FormData) {
  await requireAdmin();
  updateMeme(slug, {
    title: String(formData.get("title") || ""),
    summary: String(formData.get("summary") || ""),
    contentTr: String(formData.get("contentTr") || ""),
  });
  revalidatePath("/");
  revalidatePath(`/memes/${slug}`);
  revalidatePath("/admin");
  redirect("/admin?saved=1");
}

export async function deleteMemeAction(slug: string) {
  await requireAdmin();
  deleteMeme(slug);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function startScraperAction(formData: FormData) {
  await requireAdmin();
  const mode = String(formData.get("mode") || "full") as ScraperMode;
  const lang = String(formData.get("lang") || "es").trim();
  const limit = Number.parseInt(String(formData.get("limit") || "10"), 10);
  if (!["full", "scrape", "translate"].includes(mode)) redirect("/admin?scraper=invalid");

  try {
    startScraper({ mode, lang, limit });
  } catch {
    redirect("/admin?scraper=invalid");
  }
  revalidatePath("/admin");
  redirect("/admin?scraper=started");
}
