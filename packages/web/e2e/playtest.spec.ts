import { expect, test, type Page } from "@playwright/test";

async function fixedPactDraws(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __pactDigestCalls: number }).__pactDigestCalls = 0;
    Object.defineProperty(Object.getPrototypeOf(globalThis.crypto), "getRandomValues", {
      configurable: true, value<T extends ArrayBufferView | null>(array: T): T {
        if (array) new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(0);
        return array;
      },
    });
    Object.defineProperty(Object.getPrototypeOf(globalThis.crypto.subtle), "digest", {
      configurable: true, value: async (_algorithm: AlgorithmIdentifier, input: BufferSource) => {
        (window as unknown as { __pactDigestCalls: number }).__pactDigestCalls += 1;
        const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        const [version, , , lane, counter] = JSON.parse(new TextDecoder().decode(bytes)) as [string, string, number, string, number];
        let words: number[];
        if (version === "sha256-counter-p5-art-v1") words = Array(8).fill(0);
        else if (lane === "initial") words = counter === 0 ? [7, 7, 8, 8, 5, 9, 0, 0] : Array(8).fill(0);
        else if (lane === "luz" || lane === "sombra" || lane === "dealer") words = Array(8).fill(9);
        else if (lane === "cofre") words = Array(8).fill(4);
        else words = Array(8).fill(0);
        const block = new Uint8Array(32); const view = new DataView(block.buffer);
        words.forEach((word, index) => view.setUint32(index * 4, word, true));
        return block.buffer;
      },
    });
  });
}

async function startPactLab(page: Page) {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Modo de jogo" }).selectOption("pact-a1a");
  await page.getByRole("button", { name: "Jogar livre" }).click();
}

async function finishPactRound(page: Page) {
  await page.getByRole("button", { name: "Confirmar composição" }).click();
  const conserve = page.getByRole("button", { name: "Conservar Foco" });
  if (await conserve.count()) await conserve.click();
  for (let hand = 0; hand < 2; hand += 1) {
    const double = page.getByRole("button", { name: "Dobrar" });
    if (await double.count()) await double.click();
  }
  const resolve = page.getByRole("button", { name: "Resolver dealer" });
  if (await resolve.count()) await resolve.click();
  await expect(page.getByRole("region", { name: "Resultado da rodada" })).toBeVisible();
}

async function advancePactToOffer(page: Page) {
  await startPactLab(page);
  for (let round = 1; round <= 3; round += 1) {
    await expect(page.locator('.viewport-table[data-game-phase="betting"]')).toBeVisible();
    await page.getByRole("button", { name: "Confirmar aposta e distribuir" }).click();
    await finishPactRound(page);
    await page.getByRole("button", { name: "Próxima rodada" }).click();
  }
  await expect(page.getByRole("heading", { name: "Escolha um Pacto ou recuse" })).toBeVisible();
}

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
  await expect(page.getByText(new RegExp(`Total ${dealerTotal} ·`))).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Conservar Foco" })).toBeVisible();

  await page.getByRole("button", { name: "Escolher Manobra · 1 Foco" }).click();
  const target = page.getByRole("group", { name: "Cartas elegíveis para Manobra" }).getByRole("button").first();
  await target.click();
  await page.getByRole("button", { name: "Confirmar alvo" }).click();
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
  await page.getByRole("button", { name: "Confirmar alvo" }).click();
  await expect(page.getByRole("dialog", { name: "Confirmar Manobra" })).toBeVisible();
  await expect(page.getByText(/Leitura pendente será pulada na mesma transição/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Confirmar gasto" }).click();
  await expect(page.getByText("0 de 3 restantes")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();

  for (let action = 0; action < 5; action += 1) {
    const stand = page.getByRole("button", { name: "Parar" });
    if (await stand.count()) await stand.click();
  }
  const resolve = page.getByRole("button", { name: "Resolver dealer" });
  if (await resolve.count()) await resolve.click();
  await expect(page.getByRole("region", { name: "Resultado da rodada" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Próxima rodada" })).toBeEnabled();
  const completedRoundLabel = await page.locator(".table-title-block .eyebrow").textContent();
  const completedRoundNumber = Number(completedRoundLabel?.match(/RODADA (\d+)/i)?.[1]);
  expect(Number.isInteger(completedRoundNumber)).toBe(true);
  await page.getByRole("button", { name: "Próxima rodada" }).click();
  await expect(page.getByText(new RegExp(`NOITE · RODADA ${completedRoundNumber + 1} DE 10`, "i"))).toBeVisible();
  await expect(page.getByText("0 de 3 restantes")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Modo de jogo" })).toHaveCount(0);
});

test("P5 card lab keeps every gameplay phase inside target viewports and preserves dealer privacy", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    // This browser fixture fixes only local deck setup; production exposes no seed/fixture control.
    Object.defineProperty(Object.getPrototypeOf(globalThis.crypto), "getRandomValues", {
      configurable: true,
      value<T extends ArrayBufferView | null>(array: T): T {
        if (array) new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(0);
        return array;
      },
    });
    const subtle = Object.getPrototypeOf(globalThis.crypto.subtle);
    Object.defineProperty(subtle, "digest", {
      configurable: true,
      value: async (_algorithm: AlgorithmIdentifier, input: BufferSource) => {
        const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        const [version, , , lane, counter] = JSON.parse(new TextDecoder().decode(bytes)) as [string, string, number, string, number];
        let words: number[];
        if (version === "sha256-counter-p5-art-v1") words = Array(8).fill(0);
        else if (lane === "initial") words = counter === 0 ? [7, 7, 7, 7, 4, 8, 0, 0] : Array(8).fill(0);
        else if (lane === "dealer") words = Array(8).fill(1);
        else if (lane === "cofre") words = Array(8).fill(4);
        else words = Array(8).fill(1);
        const block = new Uint8Array(32); const view = new DataView(block.buffer);
        words.forEach((word, index) => view.setUint32(index * 4, word, true));
        return block.buffer;
      },
    });
  });
  await page.goto("/");
  await page.getByRole("combobox", { name: "Modo de jogo" }).selectOption("p5-cards");
  await expect(page.getByText(/Laboratório de cartas sem apostas/i)).toBeVisible();
  await page.getByRole("button", { name: "Jogar livre" }).click();
  await expect(page.getByRole("heading", { name: /Duas Faces · Cofre \+ Foco/i })).toBeVisible();
  await expect(page.getByText(/Laboratório P5 de cartas/)).toBeVisible();

  const viewports = [
    { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 },
    { width: 390, height: 844 }, { width: 360, height: 640 },
  ];
  const checkPhase = async (phase: string, actionNames: string[], cards: string[], screenshotStem: string) => {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await expect(page.locator(`.viewport-table[data-game-phase="${phase}"]`)).toBeVisible();
      const layout = await page.evaluate(() => {
        const shell = document.querySelector<HTMLElement>(".game-session-shell")!;
        const nodes = [".table-heading", ".phase-status", ".table-board", ".table-action-dock"].map(selector => {
          const element = document.querySelector<HTMLElement>(selector)!; const rect = element.getBoundingClientRect();
          return { selector, top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height };
        });
        return { scrollHeight: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth,
          innerHeight: window.innerHeight, innerWidth: window.innerWidth, shellHeight: shell.scrollHeight, shellClientHeight: shell.clientHeight, nodes };
      });
      expect(layout.scrollHeight, `document vertical scroll at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(layout.innerHeight + 1);
      expect(layout.scrollWidth, `document horizontal scroll at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(layout.innerWidth + 1);
      expect(layout.shellHeight, `session shell scroll at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(layout.shellClientHeight + 1);
      for (const node of layout.nodes) {
        expect(node.width, `${node.selector} width`).toBeGreaterThan(0);
        expect(node.height, `${node.selector} height`).toBeGreaterThan(0);
        expect(node.top).toBeGreaterThanOrEqual(-1); expect(node.left).toBeGreaterThanOrEqual(-1);
        expect(node.bottom).toBeLessThanOrEqual(layout.innerHeight + 1); expect(node.right).toBeLessThanOrEqual(layout.innerWidth + 1);
      }
      for (const name of actionNames) {
        const control = page.getByRole("button", { name });
        await expect(control).toBeVisible(); await expect(control).toBeEnabled(); await expect(control).toBeInViewport();
        expect(await control.evaluate(element => {
          const rect = element.getBoundingClientRect(); const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return rect.top >= -1 && rect.left >= -1 && rect.bottom <= innerHeight + 1 && rect.right <= innerWidth + 1 && (hit === element || element.contains(hit));
        }), `${name} clickable at ${viewport.width}x${viewport.height}`).toBe(true);
      }
      for (const name of cards) await expect(page.getByRole("list", { name })).toBeVisible();
      if (viewport.width !== 360) {
        await page.screenshot({ path: testInfo.outputPath(`${screenshotStem}-${viewport.width}x${viewport.height}.png`) });
      }
    }
  };

  const dealer = page.getByRole("list", { name: "Cartas visíveis do dealer" });
  await expect(dealer.getByRole("img", { name: "Carta do dealer fechada" })).toBeVisible();
  await expect(dealer.getByRole("img", { name: /Carta lida do dealer/ })).toHaveCount(0);
  await checkPhase("compose", ["Confirmar composição"], ["Quatro cartas iniciais", "Carta do Cofre", "Cartas visíveis do dealer"], "compose");
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("button", { name: "Confirmar composição" }).click();

  await expect(page.getByRole("heading", { name: /Janela de Foco/ })).toBeVisible();
  await expect(dealer.getByRole("img", { name: "Carta do dealer fechada" })).toBeVisible();
  await expect(dealer.getByRole("img", { name: /Carta lida do dealer/ })).toHaveCount(0);
  await checkPhase("focusWindow", ["Escolher Leitura · 2 Focos", "Escolher Manobra · 1 Foco", "Conservar Foco"], ["Cartas da mão Luz", "Cartas da mão Sombra", "Carta do Cofre", "Cartas visíveis do dealer"], "focus");
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("button", { name: "Escolher Leitura · 2 Focos" }).click();
  await page.getByRole("button", { name: "Confirmar gasto" }).click();
  await expect(dealer.getByRole("img", { name: /Carta lida do dealer/ })).toHaveCount(1);
  await expect(dealer.getByRole("img", { name: /Compra do dealer/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Conservar Foco|Continuar/ }).click();

  await checkPhase("player", ["Parar"], ["Cartas da mão Luz", "Cartas da mão Sombra", "Carta do Cofre", "Cartas visíveis do dealer"], "player");
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("button", { name: "Parar" }).click();
  await page.getByRole("button", { name: "Parar" }).click();
  await checkPhase("dealer", ["Resolver dealer"], ["Cartas da mão Luz", "Cartas da mão Sombra", "Carta do Cofre", "Cartas visíveis do dealer"], "dealer");
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("button", { name: "Resolver dealer" }).click();
  await expect(page.getByRole("region", { name: "Resultado da rodada" })).toBeVisible();
  await expect(dealer.getByRole("img", { name: "Carta do dealer fechada" })).toHaveCount(0);
  await checkPhase("complete", ["Próxima rodada"], ["Cartas da mão Luz", "Cartas da mão Sombra", "Carta do Cofre", "Cartas visíveis do dealer"], "result");
});

test("A0.1 settles one motor round, begins round two, and expires on abandonment", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("combobox", { name: "Modo de jogo" }).selectOption("bankroll-a0");
  await expect(page.getByText(/10 rodadas e cobertura reservada de 40/i)).toBeVisible();
  await page.getByRole("button", { name: "Jogar livre" }).click();

  const bank = page.getByRole("region", { name: "Banca fictícia A0.1" });
  await expect(bank).toContainText("150 fichas");
  await expect(bank).toContainText("10+10 · reserva 40 · disponível 110");
  await expect(page.getByText(/NOITE · RODADA 1 DE 10/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const finishRound = async () => {
    const compose = page.getByRole("button", { name: "Confirmar composição" });
    if (await compose.count()) await compose.click();
    const conserve = page.getByRole("button", { name: /Conservar Foco|Continuar/i });
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
  const settledBank = await bank.locator("strong").textContent();
  expect(Number(settledBank?.replace(" fichas", ""))).toBe(150 + engineScore);
  await page.getByRole("button", { name: "Guia e dados" }).click();
  await expect(page.getByRole("dialog", { name: "Guia e dados da Noite" }).getByText("1 / 0")).toBeVisible();
  await page.getByRole("button", { name: "Fechar" }).click();
  await page.getByRole("button", { name: "Próxima rodada" }).click();
  await expect(page.getByText(/NOITE · RODADA 2 DE 10/i)).toBeVisible();
  await expect(bank).toContainText("Banca · financiada");
  await expect(bank).toContainText("10+10 · reserva 40");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Encerrar" }).click();
  await expect(page.getByText("Noite encerrada · recursos expirados")).toBeVisible();
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
    await page.getByRole("button", { name: "Conservar Foco" }).click();
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
      await expect(bank).toContainText("Saldo congelado até o fim da Noite");
      await expect(bank).toContainText("0 fichas");
    }
  };

  for (const [round, doubles] of [[1, 2], [2, 2], [3, 1], [4, 2]] as const) {
    await finishRound(doubles);
    const expectedBalance = [110, 70, 40, 0][round - 1]!;
    await expect(bank.locator("strong")).toHaveText(`${expectedBalance} fichas`);
    if (round < 4) {
      await page.getByRole("button", { name: "Próxima rodada" }).click();
      await expect(page.getByText(new RegExp(`RODADA ${round + 1} DE 10`, "i"))).toBeVisible();
    }
  }

  await page.getByRole("button", { name: "Próxima rodada" }).click();
  await expect(page.getByText(/RODADA 5 DE 10/i)).toBeVisible();
  await expect(bank).toContainText("Saldo congelado até o fim da Noite");
  await expect(bank.locator("strong")).toHaveText("0 fichas");
  await expect(page.getByText("3 de 3 restantes")).toBeVisible();
  const scoreBeforePractice = await page.getByLabel("Placar da Noite").locator("strong").textContent();
  await finishRound(0, true);
  const scoreAfterPractice = await page.getByLabel("Placar da Noite").locator("strong").textContent();
  expect(scoreAfterPractice).not.toBe(scoreBeforePractice);
  await expect(bank.locator("strong")).toHaveText("0 fichas");
  await page.getByRole("button", { name: "Guia e dados" }).click();
  const details = page.getByRole("dialog", { name: "Guia e dados da Noite" });
  await expect(details.getByText("4 / 1")).toBeVisible();
  await expect(details.getByText("0 · prática")).toBeVisible();
  await expect(page.getByText("3 de 3 restantes")).toBeVisible();
});

test("A1a confirms the stake before any random draw, keeps the whole stake equal, lowers it to available coverage, and freezes bank in practice", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    (window as unknown as { __a1aCryptoCalls: number }).__a1aCryptoCalls = 0;
    Object.defineProperty(Object.getPrototypeOf(globalThis.crypto), "getRandomValues", {
      configurable: true,
      value<T extends ArrayBufferView | null>(array: T): T {
        (window as unknown as { __a1aCryptoCalls: number }).__a1aCryptoCalls += 1;
        if (array) new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(0);
        return array;
      },
    });
    const subtlePrototype = Object.getPrototypeOf(globalThis.crypto.subtle);
    Object.defineProperty(subtlePrototype, "digest", {
      configurable: true,
      value: async (_algorithm: AlgorithmIdentifier, input: BufferSource) => {
        (window as unknown as { __a1aCryptoCalls: number }).__a1aCryptoCalls += 1;
        const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        const [version, , , lane, counter] = JSON.parse(new TextDecoder().decode(bytes)) as [string, string, number, string, number];
        let words: number[];
        if (version === "sha256-counter-p5-art-v1") words = Array(8).fill(0);
        else if (lane === "initial") words = counter === 0 ? [9, 1, 9, 1, 9, 6, 0, 0] : Array(8).fill(0);
        else if (lane === "luz" || lane === "sombra") words = Array(8).fill(1);
        else if (lane === "cofre") words = Array(8).fill(4);
        else words = Array(8).fill(0);
        const block = new Uint8Array(32); const view = new DataView(block.buffer);
        words.forEach((word, index) => view.setUint32(index * 4, word, true));
        return block.buffer;
      },
    });
  });

  await page.goto("/");
  await page.getByRole("combobox", { name: "Modo de jogo" }).selectOption("bankroll-a1a");
  await expect(page.getByText(/cobertura 4s/i)).toBeVisible();
  await page.getByRole("button", { name: "Jogar livre" }).click();
  await expect(page.locator('.viewport-table[data-game-phase="betting"]')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __a1aCryptoCalls: number }).__a1aCryptoCalls)).toBe(0);

  const viewports = [
    { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 },
    { width: 390, height: 844 }, { width: 360, height: 640 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const metrics = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".game-session-shell")!;
      return {
      width: document.documentElement.scrollWidth, innerWidth,
      height: document.documentElement.scrollHeight, innerHeight,
      shellHeight: shell.scrollHeight, shellClientHeight: shell.clientHeight,
      };
    });
    expect(metrics.width, `betting horizontal scroll ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.height, `betting vertical scroll ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(metrics.innerHeight + 1);
    expect(metrics.shellHeight).toBeLessThanOrEqual(metrics.shellClientHeight + 1);
    for (const name of ["Fichas por mão (Luz e Sombra)", "Adicionar 5 fichas", "Desfazer", "Limpar", "Repetir aposta", "Confirmar aposta e distribuir"]) {
      const locator = name === "Fichas por mão (Luz e Sombra)" ? page.getByRole("spinbutton", { name }) : page.getByRole("button", { name });
      if (name === "Repetir aposta" || name === "Desfazer") {
        await expect(locator).toBeVisible(); await expect(locator).toBeInViewport();
        continue; // unavailable actions stay visible but disabled until a prior stake/edit exists
      }
      await expect(locator).toBeVisible(); await expect(locator).toBeInViewport(); await expect(locator).toBeEnabled();
      expect(await locator.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return hit === element || element.contains(hit);
      }), `${name} is clickable at ${viewport.width}x${viewport.height}`).toBe(true);
    }
    if (viewport.width !== 360) await page.screenshot({ path: testInfo.outputPath(`a1a-betting-${viewport.width}x${viewport.height}.png`) });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Adicionar 5 fichas" }).click();
  await expect(page.getByRole("spinbutton", { name: "Fichas por mão (Luz e Sombra)" })).toHaveValue("6");
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByRole("spinbutton", { name: "Fichas por mão (Luz e Sombra)" })).toHaveValue("1");
  await page.getByRole("button", { name: "Limpar" }).click();
  await page.getByRole("spinbutton", { name: "Fichas por mão (Luz e Sombra)" }).fill("5");
  await expect(page.getByText("Reserva máxima `R = 4s`")).toBeVisible();
  await expect(page.getByText("20 fichas", { exact: true })).toBeVisible();
  // Simultaneous click events must open only one wagered round, with no stale retry error.
  await page.getByRole("button", { name: "Confirmar aposta e distribuir" }).evaluate(element => {
    (element as HTMLButtonElement).click();
    (element as HTMLButtonElement).click();
  });
  await expect(page.locator('.viewport-table[data-game-phase="compose"]')).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __a1aCryptoCalls: number }).__a1aCryptoCalls)).toBeGreaterThan(0);
  const dealer = page.getByRole("list", { name: "Cartas visíveis do dealer" });
  await expect(dealer.getByRole("img", { name: "Carta do dealer fechada" })).toBeVisible();
  await expect(dealer.getByRole("img", { name: /Carta lida do dealer|Compra do dealer/ })).toHaveCount(0);

  const bank = page.getByRole("region", { name: "Banca fictícia A1a" });
  const profit = page.getByLabel("Lucro da Noite");
  const finishLossRound = async () => {
    await page.getByRole("button", { name: "Confirmar composição" }).click();
    const conserve = page.getByRole("button", { name: "Conservar Foco" });
    if (await conserve.count()) await conserve.click();
    await page.getByRole("button", { name: "Dobrar" }).click();
    await page.getByRole("button", { name: "Dobrar" }).click();
    await page.getByRole("button", { name: "Resolver dealer" }).click();
    await expect(page.getByRole("region", { name: "Resultado da rodada" })).toBeVisible();
    await expect(page.getByText(/Pontuação desta rodada: −40 pontos/)).toBeVisible();
  };

  await expect(bank).toContainText("150 fichas");
  await expect(profit.locator("strong")).toHaveText("0 fichas");
  await expect(bank).toContainText("5 por mão · reserva 20");
  await finishLossRound();
  await expect(bank).toContainText("130 fichas");
  await expect(profit.locator("strong")).toHaveText("−20 fichas");
  await page.getByRole("button", { name: "Próxima rodada" }).click();
  await expect(page.locator('.viewport-table[data-game-phase="betting"]')).toBeVisible();
  await expect(page.getByText(/Escolha entre 1 e 32 fichas por mão/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Repetir aposta" })).toBeEnabled();
  await page.getByRole("button", { name: "Repetir aposta" }).click();
  await expect(page.getByRole("spinbutton", { name: "Fichas por mão (Luz e Sombra)" })).toHaveValue("5");
  await page.getByRole("spinbutton", { name: "Fichas por mão (Luz e Sombra)" }).fill("27");
  await page.getByRole("button", { name: "Confirmar aposta e distribuir" }).click();
  await finishLossRound();
  await expect(bank).toContainText("22 fichas");
  await expect(profit.locator("strong")).toHaveText("−128 fichas");
  await page.getByRole("button", { name: "Próxima rodada" }).click();
  await expect(page.getByText(/Escolha entre 1 e 5 fichas por mão/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Repetir aposta" })).toBeDisabled();
  await expect(page.getByRole("spinbutton", { name: "Fichas por mão (Luz e Sombra)" })).toHaveValue("5");
  await page.getByRole("button", { name: "Confirmar aposta e distribuir" }).click();
  await finishLossRound();
  await expect(bank).toContainText("2 fichas");
  await expect(profit.locator("strong")).toHaveText("−148 fichas");
  await expect(page.getByRole("region", { name: "Resultado da rodada" })).toContainText("Pontuação acumulada: −120 · Foco");
  await expect(page.getByRole("button", { name: "Próxima rodada" })).toBeEnabled();
  await page.getByRole("button", { name: "Próxima rodada" }).click();
  await expect(page.getByText(/Prática gratuita: a banca está congelada/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar rodada gratuita" })).toBeVisible();
  const focusBeforePractice = await page.getByLabel("Foco restante").locator("strong").textContent();
  await page.getByRole("button", { name: "Iniciar rodada gratuita" }).click();
  await finishLossRound();
  await expect(profit.locator("strong")).toHaveText("−148 fichas");
  await expect(page.getByRole("region", { name: "Resultado da rodada" })).toContainText("Pontuação acumulada: −160 · Foco");
  await expect(page.getByLabel("Foco restante").locator("strong")).toContainText(focusBeforePractice!);
  await expect(bank).toContainText("2 fichas");
  await expect(bank).toContainText("Saldo congelado até o fim da Noite");
});

test("PACT-LAB-0.1 offers Véu before round-four stake/deal and redacts the real upcard until composition", async ({ page }) => {
  await fixedPactDraws(page);
  await advancePactToOffer(page);
  const offer = page.locator('.viewport-table[data-game-phase="pact-offer"]');
  await expect(offer).toBeVisible();
  await expect(offer).toContainText("Renúncia");
  await expect(offer).toContainText("Privilégio");
  await page.getByRole("radio", { name: "Luz" }).check();
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(viewport);
    const metrics = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
      innerWidth, innerHeight }));
    expect(metrics.width, `Pact offer horizontal scroll ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.height, `Pact offer vertical scroll ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(metrics.innerHeight + 1);
    for (const name of ["Assinar Véu", "Assinar Ferro", "Recusar Pactos"]) {
      const button = page.getByRole("button", { name });
      await expect(button).toBeVisible(); await expect(button).toBeEnabled(); await expect(button).toBeInViewport();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const digestCallsBeforeSignature = await page.evaluate(() => (window as unknown as { __pactDigestCalls: number }).__pactDigestCalls);
  await page.getByRole("button", { name: "Assinar Véu" }).click();
  await expect(page.locator('.viewport-table[data-game-phase="betting"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __pactDigestCalls: number }).__pactDigestCalls)).toBe(digestCallsBeforeSignature);
  await page.getByRole("button", { name: "Confirmar aposta e distribuir" }).click();
  const dealer = page.getByRole("list", { name: "Cartas visíveis do dealer" });
  await expect(page.locator('.viewport-table[data-game-phase="compose"]')).toBeVisible();
  await expect(dealer.getByRole("img", { name: /oculta pelo Pacto do Véu durante composição/ })).toBeVisible();
  await expect(dealer.getByRole("img", { name: "Carta do dealer fechada" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar composição" }).click();
  await expect(dealer.getByRole("img", { name: "Carta aberta do dealer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Usar Privilégio de Leitura · gratuito" })).toBeVisible();
  await page.getByRole("button", { name: "Usar Privilégio de Leitura · gratuito" }).click();
  await expect(page.getByRole("dialog", { name: "Confirmar Leitura" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar Privilégio" }).click();
  await expect(page.getByText("3 de 3 restantes")).toBeVisible();
  await expect(page.getByText("Privilégio: Leitura · Consumido")).toBeVisible();
  await expect(dealer.getByRole("img", { name: /Carta lida do dealer/ })).toHaveCount(1);
  await expect(dealer.getByRole("img", { name: /Compra do dealer/ })).toHaveCount(0);
});

test("PACT-LAB-0.1 enforces Iron on the chosen Face, supports free Manobra, and allows refusal", async ({ page }) => {
  await fixedPactDraws(page);
  await advancePactToOffer(page);
  await page.getByRole("radio", { name: "Sombra" }).check();
  await page.getByRole("button", { name: "Assinar Ferro" }).click();
  await page.getByRole("button", { name: "Confirmar aposta e distribuir" }).click();
  await page.getByRole("button", { name: "Confirmar composição" }).click();
  await expect(page.getByRole("button", { name: "Usar Privilégio de Manobra · gratuito" })).toBeEnabled();
  await page.getByRole("button", { name: "Usar Privilégio de Manobra · gratuito" }).click();
  await page.getByRole("group", { name: "Cartas elegíveis para Manobra" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Confirmar alvo" }).click();
  await page.getByRole("button", { name: "Confirmar Privilégio" }).click();
  await expect(page.getByText("3 de 3 restantes")).toBeVisible();
  await expect(page.getByText("Privilégio: Manobra · Consumido")).toBeVisible();
  await page.getByRole("button", { name: /Conservar Foco|Continuar/ }).click();
  await page.getByRole("button", { name: "Dobrar" }).click(); // Luz retains its normal action.
  await expect(page.getByRole("group", { name: "Ações para Sombra" }).getByRole("button", { name: "Dobrar" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Ações para Sombra" }).getByRole("button", { name: "Comprar" })).toBeVisible();

  await page.reload();
  await advancePactToOffer(page);
  await page.getByRole("button", { name: "Recusar Pactos" }).click();
  await page.getByRole("button", { name: "Confirmar aposta e distribuir" }).click();
  await expect(page.locator('.viewport-table[data-game-phase="compose"]')).toBeVisible();
  const dealer = page.getByRole("list", { name: "Cartas visíveis do dealer" });
  await expect(dealer.getByRole("img", { name: "Carta aberta do dealer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar composição" })).toBeVisible();
});
