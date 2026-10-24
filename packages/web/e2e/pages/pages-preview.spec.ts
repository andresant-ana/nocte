import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function useRepeatablePactSeed(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Object.getPrototypeOf(globalThis.crypto), "getRandomValues", {
      configurable: true,
      value<T extends ArrayBufferView | null>(array: T): T {
        if (array) new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(0);
        return array;
      },
    });
    Object.defineProperty(Object.getPrototypeOf(globalThis.crypto.subtle), "digest", {
      configurable: true,
      value: async (_algorithm: AlgorithmIdentifier, input: BufferSource) => {
        const bytes = input instanceof ArrayBuffer
          ? new Uint8Array(input)
          : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        const [version, , , lane, counter] = JSON.parse(new TextDecoder().decode(bytes)) as [string, string, number, string, number];
        const words = version === "sha256-counter-p5-art-v1" ? Array(8).fill(0)
          : lane === "initial" ? (counter === 0 ? [7, 7, 8, 8, 5, 9, 0, 0] : Array(8).fill(0))
            : lane === "luz" || lane === "sombra" || lane === "dealer" ? Array(8).fill(9)
              : lane === "cofre" ? Array(8).fill(4) : Array(8).fill(0);
        const block = new Uint8Array(32);
        const view = new DataView(block.buffer);
        words.forEach((word: number, index: number) => view.setUint32(index * 4, word, true));
        return block.buffer;
      },
    });
  });
}

async function finishRound(page: Page) {
  await page.getByRole("button", { name: "Confirmar composição" }).click();
  const conserve = page.getByRole("button", { name: /Conservar Foco|Continuar/ });
  if (await conserve.count()) await conserve.click();
  for (let action = 0; action < 8; action += 1) {
    const stop = page.getByRole("button", { name: "Parar" });
    if (!(await stop.count())) break;
    await stop.first().click();
  }
  const resolve = page.getByRole("button", { name: "Resolver dealer" });
  if (await resolve.count()) await resolve.click();
  await expect(page.getByRole("region", { name: "Resultado da rodada" })).toBeVisible();
}

async function expectViewportFit(page: Page) {
  const fit = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
    bodyWidth: document.body.scrollWidth,
    bodyHeight: document.body.scrollHeight,
    shellFits: [...document.querySelectorAll<HTMLElement>(".game-session-shell")]
      .every((element) => element.scrollHeight <= element.clientHeight + 1),
  }));
  expect(fit.documentWidth, JSON.stringify(fit)).toBeLessThanOrEqual(fit.viewportWidth);
  expect(fit.documentHeight, JSON.stringify(fit)).toBeLessThanOrEqual(fit.viewportHeight);
  expect(fit.bodyWidth, JSON.stringify(fit)).toBeLessThanOrEqual(fit.viewportWidth);
  expect(fit.bodyHeight, JSON.stringify(fit)).toBeLessThanOrEqual(fit.viewportHeight);
  expect(fit.shellFits, JSON.stringify(fit)).toBe(true);
}

test("GitHub Pages subpath loads assets and supports an optional full Book of Pacts playtest", async ({ page }) => {
  const externalRequests: string[] = [];
  const failedResponses: string[] = [];
  const requestsOutsideBase: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.protocol !== "http:" && requestUrl.protocol !== "https:") return;
    if (requestUrl.origin !== "http://127.0.0.1:4174") externalRequests.push(request.url());
    else if (!requestUrl.pathname.startsWith("/nocte/")) requestsOutsideBase.push(request.url());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await useRepeatablePactSeed(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/nocte/");
  expect(await page.evaluate(() => ({
    secure: isSecureContext,
    randomUUID: typeof crypto.randomUUID,
    subtleDigest: typeof crypto.subtle.digest,
  }))).toEqual({ secure: true, randomUUID: "function", subtleDigest: "function" });
  await expect(page.getByText(/Protótipo experimental\. As fichas são 100% fictícias/i)).toBeVisible();

  await page.getByRole("combobox", { name: "Modo de jogo" }).selectOption("pact-book-a1a");
  const consent = page.getByRole("checkbox", { name: /participar do playtest local opcional/i });
  await expect(consent).not.toBeChecked();
  await expect(page.getByText(/provedor pode registrar dados técnicos do acesso/i)).toBeVisible();
  await consent.check();
  await page.getByRole("button", { name: "Jogar livre" }).click();

  for (let round = 1; round <= 10; round += 1) {
    if (round === 4 || round === 8) {
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("heading", { name: "Escolha um Pacto ou recuse" })).toBeVisible();
      await expectViewportFit(page);
      await expect(page.getByRole("button", { name: "Recusar Pactos" })).toBeVisible();
      await page.getByRole("button", { name: "Recusar Pactos" }).click();
    }
    await expect(page.locator('.a1a-bet-table[data-game-phase="betting"]')).toBeVisible();
    await expectViewportFit(page);
    await expect(page.getByRole("button", { name: "Confirmar aposta e distribuir" })).toBeVisible();
    await page.getByRole("button", { name: "Confirmar aposta e distribuir" }).click();
    await page.setViewportSize(round % 2 === 0 ? { width: 390, height: 844 } : { width: 1366, height: 768 });
    await expectViewportFit(page);
    await finishRound(page);
    await expectViewportFit(page);
    if (round < 10) await page.getByRole("button", { name: "Próxima rodada" }).click();
  }

  await page.getByRole("button", { name: "Voltar à configuração" }).click();
  await expect(page.getByTestId("pact-playtest-survey")).toBeVisible();
  await expectViewportFit(page);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("nocte-pact-playtest.json");
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const exportText = await readFile(downloadedPath!, "utf8");
  const data = JSON.parse(exportText) as { status: string; events: Array<{ type: string; round?: number; choice?: string }> };
  expect(data.status).toBe("complete");
  expect(data.events.filter((event) => event.type === "offer").map((event) => event.round)).toEqual([4, 8]);
  expect(data.events.filter((event) => event.type === "choice").map((event) => event.choice)).toEqual(["refused", "refused"]);
  expect(exportText).not.toMatch(/seed|dealerHole|dealerDraws|"cards"|"hands"|email|userAgent|timestamp/i);
  expect(externalRequests).toEqual([]);
  expect(requestsOutsideBase).toEqual([]);
  expect(failedResponses).toEqual([]);

  await page.reload();
  await expect(page.getByRole("combobox", { name: "Modo de jogo" })).toBeVisible();
  await page.getByRole("combobox", { name: "Modo de jogo" }).selectOption("pact-book-a1a");
  await expect(page.getByRole("checkbox", { name: /participar do playtest local opcional/i })).not.toBeChecked();
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});
