import { chromium } from "@playwright/test";
import fs from "fs";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

async function saveAuth(email: string, pass: string, path: string) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto("http://localhost:4173/");
    await page.getByPlaceholder(/email/i).fill(email);
    await page.getByPlaceholder(/password/i).fill(pass);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.getByTestId("tab-home").waitFor({ timeout: 15_000 });
    await page.context().storageState({ path });
  } finally {
    await browser.close();
  }
}

export default async function globalSetup() {
  fs.mkdirSync("e2e/.auth", { recursive: true });

  const TEST_EMAIL  = process.env.TEST_EMAIL       ?? "test@hotpots.local";
  const TEST_PASS   = requireEnv("TEST_PASS");
  const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@hotpots.local";
  const ADMIN_PASS  = requireEnv("TEST_ADMIN_PASS");

  await Promise.all([
    saveAuth(TEST_EMAIL,  TEST_PASS,  "e2e/.auth/user.json"),
    saveAuth(ADMIN_EMAIL, ADMIN_PASS, "e2e/.auth/admin.json"),
  ]);
}
