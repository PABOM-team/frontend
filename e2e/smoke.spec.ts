import { expect, test } from "@playwright/test";

test("루트로 들어오면 홈 탭으로 이동한다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");
});

test("개체 탭에서 목록을 보여준다", async ({ page }) => {
  await page.goto("/pets");
  await expect(page.getByRole("heading", { name: "내 개체" })).toBeVisible();
});
