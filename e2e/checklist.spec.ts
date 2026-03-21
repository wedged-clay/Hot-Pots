import { test, expect, type Page } from "@playwright/test";

// Credentials must match supabase/seed_test_accounts.sql
// Set these env vars locally via .env.test or export them before running.
// In CI they are injected as GitHub secrets — see .github/workflows/e2e.yml.
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

const TEST_EMAIL  = process.env.TEST_EMAIL       ?? "test@hotpots.local";
const TEST_PASS   = requireEnv("TEST_PASS");
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@hotpots.local";
const ADMIN_PASS  = requireEnv("TEST_ADMIN_PASS");

// ── Helper ────────────────────────────────────────────────────────
async function signIn(page: Page, email = TEST_EMAIL, pass = TEST_PASS) {
  await page.goto("/");
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(pass);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByTestId("tab-home")).toBeVisible({ timeout: 10_000 });
}

// ── Smoke test (no credentials required) ─────────────────────────
// This must be the first test. It catches any crash that prevents the
// app from rendering at all — before auth, before data loading.
// A failure here means the entire app is broken for every user.
test("app renders without crashing", async ({ page }) => {
  await page.goto("/");
  // If an error boundary is visible the app threw during render
  await expect(page.getByTestId("error-boundary")).not.toBeVisible();
  // Auth screen should appear, confirming React mounted successfully
  await expect(page.getByPlaceholder(/email/i)).toBeVisible({ timeout: 10_000 });
});

// ── Auth ──────────────────────────────────────────────────────────
test.describe("Auth flow", () => {
  test("valid credentials reach home tab", async ({ page }) => {
    await signIn(page);
  });

  test("wrong password shows error and does not crash", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
    await page.getByPlaceholder(/password/i).fill("wrong-password-xyz");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });
});

// ── Piece submission form ─────────────────────────────────────────
test.describe("Piece submission form", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.getByTestId("tab-enter").click();
  });

  test("draft persists across page reload", async ({ page }) => {
    await page.getByPlaceholder(/celadon yunomi/i).first().fill("Test Bowl");
    await page.reload();
    await signIn(page);
    await page.getByTestId("tab-enter").click();
    await expect(page.getByPlaceholder(/celadon yunomi/i).first()).toHaveValue("Test Bowl");
  });

  test("corrupt localStorage does not crash form", async ({ page }) => {
    await page.evaluate(() =>
      localStorage.setItem("piece1-draft", "NOT_JSON{{{")
    );
    await page.reload();
    await signIn(page);
    await page.getByTestId("tab-enter").click();
    await expect(page.getByTestId("error-boundary")).not.toBeVisible();
    await expect(page.getByPlaceholder(/celadon yunomi/i).first()).toHaveValue("");
  });
});

// ── Messages null guard (Bug 1 regression) ────────────────────────
test.describe("Messages thread", () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test("stale ?convo= param does not crash app", async ({ page }) => {
    await page.goto("/?convo=00000000-0000-0000-0000-000000000000");
    await expect(page.getByTestId("error-boundary")).not.toBeVisible();
    await expect(page.getByTestId("tab-home")).toBeVisible({ timeout: 8_000 });
  });
});

// ── Offline mode ──────────────────────────────────────────────────
test.describe("Offline mode", () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test("offline banner appears when network drops", async ({ page, context }) => {
    await context.setOffline(true);
    await expect(page.getByText(/offline/i)).toBeVisible({ timeout: 5_000 });
  });

  test("app does not crash while offline", async ({ page, context }) => {
    await context.setOffline(true);
    // Interact with a tab — should not throw
    await page.getByTestId("tab-home").click();
    await expect(page.getByTestId("error-boundary")).not.toBeVisible();
  });
});

// ── Admin portal ──────────────────────────────────────────────────
test.describe("Admin portal", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.getByTestId("tab-admin").click();
  });

  test("BarChart renders without NaN% widths", async ({ page }) => {
    const bars = page.locator("[data-testid='bar-segment']");
    const count = await bars.count();
    for (let i = 0; i < count; i++) {
      const style = await bars.nth(i).getAttribute("style") ?? "";
      expect(style).not.toContain("NaN");
    }
  });

  test("invite code is visible and non-empty", async ({ page }) => {
    await page.getByText(/members/i).click();
    await expect(page.getByTestId("invite-code")).not.toBeEmpty();
  });
});
