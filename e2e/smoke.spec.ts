import { expect, test } from "@playwright/test";

// 목업 모드(NEXT_PUBLIC_API_MOCKING=enabled) 기준: 카카오 = 기존 회원, 구글 = 새 회원

test("로그인 전에는 첫 화면으로 보낸다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome/);
  await expect(page.getByRole("button", { name: "카카오로 시작하기" })).toBeVisible();
});

test("카카오로 시작하면 오늘 할 일과 개체 목록을 본다", async ({ page }) => {
  await page.goto("/welcome");
  await page.getByRole("button", { name: "카카오로 시작하기" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("link", { name: "오늘" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("오늘의 할 일")).toBeVisible();

  await page.getByRole("link", { name: "개체" }).click();
  await expect(page.getByRole("heading", { name: "내 개체" })).toBeVisible();
  await expect(page.getByText("콩이")).toBeVisible();
});
