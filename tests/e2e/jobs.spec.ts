import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, request }) => {
  const username = `user${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const res = await request.post("/api/v1/auth/signup", {
    data: { fullName: "E2E User", username, password: "correct-horse-1" },
  });
  expect(res.ok()).toBeTruthy();
  const { token } = await res.json();
  await page.addInitScript((t) => {
    localStorage.setItem("vmi.token", t);
    localStorage.setItem("vmi.persona", "engineer");
  }, token);
});

test("create a job, find it, open it and archive it", async ({ page }) => {
  await page.goto("/jobs/new");

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("At least 3 characters")).toBeVisible();

  await page.getByLabel("Title").fill("Bracket 6061 batch");
  await page.getByLabel("Goal").fill("Machine 200 aluminium brackets from the drawing");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Material").fill("Al 6061");
  await page.getByLabel("Quantity").fill("200");
  await page.getByRole("button", { name: "Create job" }).click();

  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Bracket 6061 batch" })).toBeVisible();
  await expect(page.getByText("Al 6061")).toBeVisible();
  await expect(page.getByText("Draft")).toBeVisible();

  await page.goto("/jobs");
  await expect(page.getByRole("link", { name: /Bracket 6061 batch/ })).toBeVisible();
  await page.getByLabel("Search jobs").fill("zzzz");
  await expect(page.getByText("No jobs match your search.")).toBeVisible();
  await page.getByLabel("Search jobs").fill("bracket");
  await page.getByRole("link", { name: /Bracket 6061 batch/ }).click();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Archive job" }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByRole("link", { name: /Bracket 6061 batch/ })).toHaveCount(0);
});
