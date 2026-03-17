import { expect, test } from "@playwright/test";

test("main booking flow completes with QR payment success", async ({ page }) => {
  await page.goto("/");

  await page.locator("#showtime-select").selectOption("10:00");

  await page.locator('[data-seat-code="A1"]').click();
  await page.locator('[data-seat-code="B1"]').click();
  await page.locator('[data-seat-code="C1"]').click();
  await page.locator('[data-seat-code="D1"]').click();

  await expect(page.getByTestId("selected-seats")).toContainText("A1, B1, C1");
  await expect(page.getByTestId("selected-seats")).not.toContainText("D1");
  await expect(page.getByTestId("ticket-total")).toContainText("470.000");

  await page.getByLabel("Ma giam gia").fill("PROMO10");
  await page.getByRole("button", { name: "Ap dung ma" }).click();

  await expect(page.getByTestId("discount-total")).toContainText("47.000");
  await expect(page.getByTestId("payable-total")).toContainText("423.000");

  await page.getByRole("button", { name: "Thanh toan QR" }).click();

  const qrDialog = page.locator(".ant-modal");
  await expect(qrDialog.getByText("Thanh toán QR Code")).toBeVisible();
  await expect(qrDialog.getByText("A1, B1, C1")).toBeVisible();

  await page.getByRole("button", { name: "Gia lap thanh toan thanh cong" }).click();

  await expect(page.getByTestId("payment-success")).toHaveText("Thanh toan thanh cong");
  await expect(page.locator(".ant-modal")).toBeHidden();
});
