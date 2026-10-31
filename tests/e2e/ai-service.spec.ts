import { expect, test } from "@playwright/test";

let jobId = "";

test.beforeEach(async ({ page, request }) => {
  const username = `user${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const signup = await request.post("/api/v1/auth/signup", {
    data: { fullName: "E2E User", username, password: "correct-horse-1" },
  });
  const { token } = await signup.json();
  const auth = { Authorization: `Bearer ${token}` };
  jobId = (
    await (
      await request.post("/api/v1/jobs", {
        headers: auth,
        data: { title: "AI e2e job", goal: "Check the AI service" },
      })
    ).json()
  ).id;
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
  await request.post(`/api/v1/jobs/${jobId}/files`, {
    headers: auth,
    multipart: { file: { name: "drawing.pdf", mimeType: "application/pdf", buffer: pdf } },
  });
  await page.addInitScript((t) => {
    localStorage.setItem("vmi.token", t);
    localStorage.setItem("vmi.persona", "engineer");
  }, token);
});

test("runs a stub agent and the python service sees the uploaded file", async ({ page }) => {
  await page.goto(`/jobs/${jobId}`);
  await page.getByLabel("Agent").selectOption("drawing");
  await page.getByRole("button", { name: "Run agent" }).click();

  const runs = page.getByTestId("run-list");
  await expect(runs.getByText("Completed")).toBeVisible();
  await expect(runs.getByText(/Stub agent/)).toBeVisible();

  await runs.getByText("View output").click();
  await expect(runs.getByText('"filesOnDisk": 1')).toBeVisible();
});

test("the dashboard shows the AI service as running", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Running", { exact: true })).toBeVisible();
});
