import { expect, test } from "@playwright/test";

let jobId = "";

test.beforeEach(async ({ page, request }) => {
  const username = `user${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const signup = await request.post("/api/v1/auth/signup", {
    data: { fullName: "E2E User", username, password: "correct-horse-1" },
  });
  const { token } = await signup.json();
  const job = await request.post("/api/v1/jobs", {
    headers: { Authorization: `Bearer ${token}` },
    data: { title: "Upload e2e job", goal: "Check file upload end to end" },
  });
  jobId = (await job.json()).id;
  await page.addInitScript((t) => {
    localStorage.setItem("vmi.token", t);
    localStorage.setItem("vmi.persona", "engineer");
  }, token);
});

const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");

test("upload, reject bad files, delete", async ({ page }) => {
  await page.goto(`/jobs/${jobId}`);
  const input = page.locator('input[type="file"]');
  const list = page.getByTestId("file-list");

  // good file
  await input.setInputFiles({ name: "drawing.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(list.getByText("drawing.pdf")).toBeVisible();
  await expect(page.getByText("Uploaded", { exact: true }).first()).toBeVisible();

  // same content under another name -> duplicate
  await input.setInputFiles({ name: "copy.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(page.getByText(/already uploaded/)).toBeVisible();

  // text pretending to be a pdf -> signature check
  await input.setInputFiles({
    name: "fake.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("hello"),
  });
  await expect(page.getByText("does not look like a real .pdf file")).toBeVisible();

  // unsupported extension is rejected in the browser before upload
  await input.setInputFiles({
    name: "tool.exe",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("MZ"),
  });
  await expect(page.getByText(".exe files are not supported.")).toBeVisible();

  // status moved to Uploaded
  await expect(page.getByText("Uploaded", { exact: true }).first()).toBeVisible();

  // delete
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete drawing.pdf" }).click();
  await expect(list.getByText("drawing.pdf")).toHaveCount(0);
  await expect(list.getByText("No files yet.")).toBeVisible();
});
