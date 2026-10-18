import { expect, test } from "@playwright/test";

test("local study round reveals, exports, and clears only completed data", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Iniciar estudo" }).click();
  await expect(page.getByRole("heading", { name: "Estudo local" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Exportar JSON/i })).toHaveCount(0);

  await page.getByRole("button", { name: /Concordo e iniciar/i }).click();
  await expect(page.getByText("Familiarização · 1 de 3")).toBeVisible();
  const dealerCards = page.getByLabel("Cartas visíveis do dealer").getByLabel(/Carta /);
  await expect(dealerCards).toHaveCount(1);
  await page.getByRole("button", { name: /Confirmar composição/i }).click();
  if (!(await page.getByRole("region", { name: "Resultado da rodada" }).count())) {
    await expect(dealerCards).toHaveCount(1);
  }

  for (let action = 0; action < 5; action += 1) {
    const stand = page.getByRole("button", { name: "Parar" });
    if (await stand.count()) await stand.click();
  }
  const resolve = page.getByRole("button", { name: /Resolver dealer/i });
  if (await resolve.count()) {
    await expect(dealerCards).toHaveCount(1);
    await resolve.click();
  }
  await expect(page.getByRole("region", { name: "Resultado da rodada" })).toBeVisible();
  const visibleRanks = (await dealerCards.allTextContents()).map((rank) => rank.trim());
  expect(visibleRanks.length).toBeGreaterThanOrEqual(2);
  let dealerTotal = visibleRanks.reduce((total, rank) => total + (rank === "A" ? 11 : rank === "J" || rank === "Q" || rank === "K" ? 10 : Number(rank)), 0);
  let aces = visibleRanks.filter((rank) => rank === "A").length;
  while (dealerTotal > 21 && aces > 0) { dealerTotal -= 10; aces -= 1; }
  await expect(page.getByText(new RegExp(`Total final: ${dealerTotal}\\.`))).toBeVisible();
  await expect(page.getByRole("button", { name: /Exportar JSON/i })).toBeEnabled();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Exportar JSON/i }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("nocte-p2a-study.json");

  await page.getByRole("button", { name: /Retirar consentimento/i }).click();
  await expect(page.getByRole("heading", { name: "Consentimento retirado" })).toBeVisible();
  await expect(page.getByLabel("Registros consentidos")).toContainText("1");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Apagar todos os dados/i }).click();
  await expect(page.getByLabel("Registros consentidos")).toContainText("0");
});
