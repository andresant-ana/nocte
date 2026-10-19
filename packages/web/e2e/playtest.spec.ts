import { expect, test } from "@playwright/test";

test("local study round reveals, exports, and clears only completed data", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Iniciar estudo P2A" }).click();
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

test("Cofre + Foco shows all abilities together, cancels direct Manobra safely, and fits a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("combobox", { name: "Modo de jogo" }).selectOption("cofre-foco");
  await page.getByRole("combobox", { name: "Duração da Noite experimental" }).selectOption("10");
  await page.getByRole("button", { name: "Jogar livre" }).click();
  await expect(page.getByRole("heading", { name: /Duas Faces · Cofre \+ Foco/i })).toBeVisible();
  await expect(page.getByRole("list", { name: "Carta do Cofre" })).toBeVisible();
  await expect(page.getByText("3 de 3 restantes")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  let focusWindowFound = false;
  for (let attempt = 0; attempt < 5 && !focusWindowFound; attempt += 1) {
    if (await page.getByRole("button", { name: "Confirmar composição" }).count()) {
      await page.getByRole("button", { name: "Confirmar composição" }).click();
    }
    if (await page.getByRole("heading", { name: "Janela de Foco" }).count()) {
      focusWindowFound = true;
      break;
    }
    const naturalEnd = page.getByRole("region", { name: "Resultado da rodada" });
    if (await naturalEnd.count()) {
      await page.getByRole("button", { name: "Próxima rodada" }).click();
      await page.getByRole("button", { name: "Confirmar composição" }).waitFor();
    } else if (await page.getByRole("button", { name: "Resolver dealer" }).count()) {
      await page.getByRole("button", { name: "Resolver dealer" }).click();
      await page.getByRole("button", { name: "Próxima rodada" }).click();
      await page.getByRole("button", { name: "Confirmar composição" }).waitFor();
    }
  }
  expect(focusWindowFound).toBe(true);
  await expect(page.getByRole("list", { name: "Cartas visíveis do dealer" }).getByLabel(/Carta do dealer fechada/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Escolher Leitura · 2 Focos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Escolher Manobra · 1 Foco" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Conservar Foco e continuar" })).toBeVisible();

  await page.getByRole("button", { name: "Escolher Manobra · 1 Foco" }).click();
  const target = page.getByRole("group", { name: "Cartas elegíveis para Manobra" }).getByRole("button").first();
  await target.click();
  await page.getByRole("button", { name: /Pré-visualizar Manobra/i }).click();
  await expect(page.getByRole("dialog", { name: "Confirmar Manobra" })).toBeVisible();
  await expect(page.getByText(/Leitura pendente será pulada na mesma transição/i)).toBeVisible();
  await page.getByRole("button", { name: "Cancelar · manter Foco" }).click();
  await expect(page.getByText("3 de 3 restantes")).toBeVisible();
  await expect(page.getByRole("button", { name: "Escolher Leitura · 2 Focos" })).toBeVisible();

  await page.getByRole("button", { name: "Escolher Leitura · 2 Focos" }).click();
  await expect(page.getByRole("dialog", { name: "Confirmar Leitura" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar gasto" }).click();
  await expect(page.getByText("1 de 3 restantes")).toBeVisible();
  await expect(page.getByRole("list", { name: "Cartas visíveis do dealer" }).getByLabel(/Compra do dealer/)).toHaveCount(0);

  await page.getByRole("button", { name: "Escolher Manobra · 1 Foco" }).click();
  await page.getByRole("group", { name: "Cartas elegíveis para Manobra" }).getByRole("button").first().click();
  await page.getByRole("button", { name: /Pré-visualizar Manobra/i }).click();
  await expect(page.getByRole("dialog", { name: "Confirmar Manobra" })).toBeVisible();
  await expect(page.getByText(/Leitura pendente será pulada na mesma transição/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Confirmar gasto" }).click();
  await expect(page.getByText("0 de 3 restantes")).toBeVisible();
  await page.getByRole("button", { name: "Continuar às mãos" }).click();

  for (let action = 0; action < 5; action += 1) {
    const stand = page.getByRole("button", { name: "Parar" });
    if (await stand.count()) await stand.click();
  }
  const resolve = page.getByRole("button", { name: "Resolver dealer" });
  if (await resolve.count()) await resolve.click();
  await expect(page.getByRole("region", { name: "Resultado da rodada" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Próxima rodada" })).toBeEnabled();
  await page.getByRole("button", { name: "Próxima rodada" }).click();
  await expect(page.getByText(/NOITE · RODADA 2 DE 10/i)).toBeVisible();
  await expect(page.getByText("0 de 3 restantes")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Modo de jogo" })).toHaveCount(0);
});
