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

test("P5 audiovisual lab uses illustrated cards without exposing the dealer hole before Leitura", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(Object.getPrototypeOf(globalThis.crypto), "getRandomValues", {
      configurable: true,
      value<T extends ArrayBufferView | null>(array: T): T {
        if (array) new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(0);
        return array;
      },
    });
  });
  await page.goto("/");
  await page.getByRole("combobox", { name: "Modo de jogo" }).selectOption("p5-audiovisual");
  await expect(page.getByText(/primeiro laboratório audiovisual/i)).toBeVisible();
  await page.getByRole("button", { name: "Jogar livre" }).click();
  await expect(page.getByRole("heading", { name: /Duas Faces · Cofre \+ Foco/i })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Ativar efeitos sonoros/i })).not.toBeChecked();
  await expect(page.getByRole("slider", { name: "Volume dos efeitos sonoros" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /Ativar efeitos sonoros/i }).check();
  await expect(page.getByRole("slider", { name: "Volume dos efeitos sonoros" })).toBeEnabled();
  await page.getByRole("checkbox", { name: /Ativar efeitos sonoros/i }).uncheck();
  await expect(page.getByRole("slider", { name: "Volume dos efeitos sonoros" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/p5-av-0.1-mobile.png", fullPage: true });

  const dealer = page.getByRole("list", { name: "Cartas visíveis do dealer" });
  await expect(page.getByText(/P5-AV-0.1 · DF-CF-0.1-lab/i)).toBeVisible();
  const reducedDuration = await page.locator(".p5-playing-card").first().evaluate((element) => Number.parseFloat(getComputedStyle(element).animationDuration));
  expect(reducedDuration).toBeLessThan(0.001);
  await expect(dealer.getByRole("img", { name: "Carta do dealer fechada" })).toBeVisible();
  await expect(dealer.getByRole("img", { name: /Carta lida do dealer/ })).toHaveCount(0);
  await expect(dealer.getByRole("img", { name: /Compra do dealer/ })).toHaveCount(0);

  let focusWindowFound = false;
  for (let attempt = 0; attempt < 5 && !focusWindowFound; attempt += 1) {
    const compose = page.getByRole("button", { name: "Confirmar composição" });
    if (await compose.count()) await compose.click();
    if (await page.getByRole("heading", { name: "Janela de Foco" }).count()) { focusWindowFound = true; break; }
    if (await page.getByRole("region", { name: "Resultado da rodada" }).count()) {
      await page.getByRole("button", { name: "Próxima rodada" }).click();
      await page.getByRole("button", { name: "Confirmar composição" }).waitFor();
    }
  }
  expect(focusWindowFound).toBe(true);
  await expect(dealer.getByRole("img", { name: "Carta do dealer fechada" })).toBeVisible();
  await expect(dealer.getByRole("img", { name: /Carta lida do dealer/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Escolher Leitura · 2 Focos" }).click();
  await page.getByRole("button", { name: "Confirmar gasto" }).click();
  await expect(dealer.getByRole("img", { name: /Carta lida do dealer/ })).toHaveCount(1);
  await expect(dealer.getByRole("img", { name: /Compra do dealer/ })).toHaveCount(0);

  await page.getByRole("button", { name: /Conservar Foco e continuar/i }).click();
  for (let action = 0; action < 5; action += 1) {
    const stand = page.getByRole("button", { name: "Parar" });
    if (await stand.count()) await stand.click();
  }
  const resolve = page.getByRole("button", { name: "Resolver dealer" });
  if (await resolve.count()) await resolve.click();
  await expect(page.getByRole("region", { name: "Resultado da rodada" })).toBeVisible();
  await expect(dealer.getByRole("img", { name: "Carta do dealer fechada" })).toHaveCount(0);
  await expect(page.getByText(/Total final: \d+\./)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("A0.1 settles one motor round, begins round two, and expires on abandonment", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("combobox", { name: "Modo de jogo" }).selectOption("bankroll-a0");
  await expect(page.getByText(/10 rodadas e cobertura reservada de 40/i)).toBeVisible();
  await page.getByRole("button", { name: "Jogar livre" }).click();

  const bank = page.getByRole("region", { name: "Banca fictícia A0.1" });
  await expect(bank).toContainText("150 fichas");
  await expect(bank).toContainText("cobertura reservada 40 · disponível 110");
  await expect(page.getByText(/NOITE · RODADA 1 DE 10/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const finishRound = async () => {
    const compose = page.getByRole("button", { name: "Confirmar composição" });
    if (await compose.count()) await compose.click();
    const conserve = page.getByRole("button", { name: /Conservar Foco e continuar|Continuar às mãos/i });
    if (await conserve.count()) await conserve.click();
    for (let action = 0; action < 4; action += 1) {
      const stand = page.getByRole("button", { name: "Parar" });
      if (await stand.count()) await stand.click();
    }
    const resolve = page.getByRole("button", { name: "Resolver dealer" });
    if (await resolve.count()) await resolve.click();
    await expect(page.getByRole("region", { name: "Resultado da rodada" })).toBeVisible();
  };

  await finishRound();
  const roundScoreText = await page.getByText(/Pontuação desta rodada:/).textContent();
  const scoreMatch = roundScoreText?.match(/Pontuação desta rodada: ([−-]?\d+) pontos/);
  expect(scoreMatch).not.toBeNull();
  const engineScore = Number(scoreMatch![1]!.replace("−", "-"));
  const settledBank = await bank.locator(".bankroll-heading strong").textContent();
  expect(Number(settledBank?.replace(" fichas", ""))).toBe(150 + engineScore);
  await expect(bank).toContainText("Rodadas financiadas");
  await expect(bank).toContainText("1");
  await page.getByRole("button", { name: "Próxima rodada" }).click();
  await expect(page.getByText(/NOITE · RODADA 2 DE 10/i)).toBeVisible();
  await expect(bank).toContainText("Rodada financiada");
  await expect(bank).toContainText("cobertura reservada 40");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Encerrar Noite" }).click();
  await expect(page.getByRole("heading", { name: "Noite encerrada" })).toBeVisible();
  await expect(page.getByText(/Banca A0.1 expirada:/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("A0.1 enters irreversible free practice after a funded balance of 40 loses 40, while score and Focus stay independent", async ({ page }) => {
  await page.addInitScript(() => {
    // Playwright-only deterministic draw fixture. The production app exposes no seed or fixture controls.
    Object.defineProperty(Object.getPrototypeOf(globalThis.crypto), "getRandomValues", {
      configurable: true,
      value<T extends ArrayBufferView | null>(array: T): T {
        if (array) new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(0);
        return array;
      },
    });
    const subtlePrototype = Object.getPrototypeOf(globalThis.crypto.subtle);
    Object.defineProperty(subtlePrototype, "digest", {
      configurable: true,
      value: async (_algorithm: AlgorithmIdentifier, input: BufferSource) => {
        const bytes = input instanceof ArrayBuffer
          ? new Uint8Array(input)
          : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        const [, , , lane] = JSON.parse(new TextDecoder().decode(bytes)) as [string, string, number, string, number];
        const sequence = lane === "initial" ? [9, 5, 9, 5, 9, 9]
          : lane === "luz" || lane === "sombra" ? [1]
            : lane === "cofre" ? [2]
              : [0];
        const block = new Uint8Array(32); const view = new DataView(block.buffer);
        for (let word = 0; word < 8; word++) view.setUint32(word * 4, sequence[word % sequence.length] ?? 0, true);
        return block.buffer;
      },
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("combobox", { name: "Modo de jogo" }).selectOption("bankroll-a0");
  await page.getByRole("button", { name: "Jogar livre" }).click();
  const bank = page.getByRole("region", { name: "Banca fictícia A0.1" });

  const finishRound = async (doubles: number, practice = false) => {
    await page.getByRole("button", { name: "Confirmar composição" }).click();
    await page.getByRole("button", { name: "Conservar Foco e continuar" }).click();
    if (doubles === 2) {
      await page.getByRole("button", { name: "Dobrar" }).click();
      await page.getByRole("button", { name: "Dobrar" }).click();
    } else if (doubles === 1) {
      await page.getByRole("button", { name: "Dobrar" }).click();
      await page.getByRole("button", { name: "Parar" }).click();
    } else {
      await page.getByRole("button", { name: "Parar" }).click();
      await page.getByRole("button", { name: "Parar" }).click();
    }
    await page.getByRole("button", { name: "Resolver dealer" }).click();
    await expect(page.getByRole("region", { name: "Resultado da rodada" })).toBeVisible();
    if (practice) {
      await expect(bank).toContainText("banca congelada em 0 até o fim da Noite");
      await expect(bank).toContainText("0 fichas");
    }
  };

  for (const [round, doubles] of [[1, 2], [2, 2], [3, 1], [4, 2]] as const) {
    await finishRound(doubles);
    const expectedBalance = [110, 70, 40, 0][round - 1]!;
    await expect(bank.locator(".bankroll-heading strong")).toHaveText(`${expectedBalance} fichas`);
    if (round < 4) {
      await page.getByRole("button", { name: "Próxima rodada" }).click();
      await expect(page.getByText(new RegExp(`RODADA ${round + 1} DE 10`, "i"))).toBeVisible();
    }
  }

  await page.getByRole("button", { name: "Próxima rodada" }).click();
  await expect(page.getByText(/RODADA 5 DE 10/i)).toBeVisible();
  await expect(bank).toContainText("Prática gratuita — banca congelada");
  await expect(bank.locator(".bankroll-heading strong")).toHaveText("0 fichas");
  await expect(page.getByText("3 de 3 restantes")).toBeVisible();
  const scoreBeforePractice = await page.getByLabel("Placar da Noite").locator("strong").textContent();
  await finishRound(0, true);
  const scoreAfterPractice = await page.getByLabel("Placar da Noite").locator("strong").textContent();
  expect(scoreAfterPractice).not.toBe(scoreBeforePractice);
  await expect(bank.locator(".bankroll-heading strong")).toHaveText("0 fichas");
  await expect(bank).toContainText("Rodadas de prática");
  await expect(bank.locator(".bankroll-breakdown")).toContainText("1");
  await expect(page.getByText("3 de 3 restantes")).toBeVisible();
});
