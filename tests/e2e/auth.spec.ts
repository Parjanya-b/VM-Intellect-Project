import { expect, test } from "@playwright/test";

test("first user becomes admin, reaches dashboard, signs out and back in", async ({ page }) => {
  // 1. Start: persona selection
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome/);
  await page.getByRole("button", { name: /^I am a Engineer/ }).click();

  // 2. First account on a fresh machine = administrator
  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByRole("heading", { name: /administrator account/i })).toBeVisible();

  // validation errors show up
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your name")).toBeVisible();

  await page.getByLabel("Full name").fill("Test Admin");
  await page.getByLabel("Username").fill("admin1");
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-1");
  await page.getByLabel("Confirm password").fill("correct-horse-1");
  await page.getByRole("button", { name: "Create account" }).click();

  // 3. Dashboard
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Hello, Test/ })).toBeVisible();
  await expect(page.getByText("Offline ready")).toBeVisible();
  await expect(page.getByText("(admin)")).toBeVisible();

  // 4. Sign out, pick persona again, sign in
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/welcome/);
  await page.getByRole("button", { name: /^I am a Student/ }).click();
  await expect(page).toHaveURL(/\/signin/);

  await page.getByLabel("Username").fill("admin1");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect username or password.")).toBeVisible();

  await page.getByLabel("Password").fill("correct-horse-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("dashboard is protected when signed out", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/signin|\/welcome/);
});
