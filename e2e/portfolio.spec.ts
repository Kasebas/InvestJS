import { expect, test } from "@playwright/test";

test("creates a vault and records the first purchase in a real browser", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Protege tu cartera" })).toBeVisible();
  await page.getByLabel("Crea una contraseña local").fill("password-segura");
  await page.getByRole("button", { name: "Crear bóveda" }).click();
  await expect(page.getByRole("heading", { name: "Buenos días, Kaseb" })).toBeVisible();

  await page.getByRole("button", { name: "Registrar operación" }).first().click();
  await page.getByLabel("Símbolo").fill("AAPL");
  await page.getByLabel("Cantidad").fill("2");
  await page.getByLabel("Importe").fill("400");
  await page.getByRole("button", { name: "Guardar operación" }).click();

  await expect(page.getByText("AAPL").first()).toBeVisible();
  await expect(page.getByText("1 posiciones activas")).toBeVisible();
});
