// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { webcrypto } from "node:crypto";
import { DF_SYM_01_3_TO_2 } from "@nocte/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudyFlow } from "./StudyFlow";
import { downloadRecords, serializeCsv, serializeJson } from "./export";
import type { CompletedRoundRecord } from "./protocol";

vi.mock("./export", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./export")>();
  return { ...actual, downloadRecords: vi.fn() };
});

async function finishCurrentRound(user: ReturnType<typeof userEvent.setup>) {
  if (screen.queryByRole("button", { name: /Confirmar composição/i })) {
    await user.click(screen.getByRole("button", { name: /Confirmar composição/i }));
  }
  for (let step = 0; step < 5 && screen.queryByRole("button", { name: "Parar" }); step += 1) {
    await user.click(screen.getByRole("button", { name: "Parar" }));
  }
  if (screen.queryByRole("button", { name: /Resolver dealer/i })) {
    await user.click(screen.getByRole("button", { name: /Resolver dealer/i }));
  }
  expect(await screen.findByRole("region", { name: "Resultado da rodada" })).toBeInTheDocument();
}

async function finishAndContinue(user: ReturnType<typeof userEvent.setup>) {
  await finishCurrentRound(user);
  const next = await screen.findByRole("button", { name: /Próxima rodada/i });
  await waitFor(() => expect(next).not.toBeDisabled());
  await user.click(next);
}

const emptyRecord: CompletedRoundRecord = {
  protocolVersion: "P2A-study-v1",
  gameVersion: "DF-SYM-0.1",
  rulesId: DF_SYM_01_3_TO_2.id,
  streamVersion: "sha256-counter-rejection-v1",
  poolVersion: "p2a-pools-v1",
  poolCatalogVersion: "p2a-pool-catalog-v1",
  solverVersion: "dp-infinite-s17-v1",
  stage: "assessment",
  seed: "=1+1",
  index: 3,
  initialCards: [{ rank: "A" }, { rank: "5" }, { rank: "6" }, { rank: "9" }],
  dealerUp: { rank: "7" },
  composition: { luz: [0, 1], sombra: [2, 3] },
  compositionDurationMs: 222.4,
  actions: [{ hand: "luz", action: "stand", durationMs: 101.2 }],
  finalHands: {
    luz: { cards: [{ rank: "A" }, { rank: "5" }], exposure: 10 },
    sombra: { cards: [{ rank: "6" }, { rank: "9" }], exposure: 10 },
  },
  settlement: {
    luz: { outcome: "loss", score: -10, playerTotal: 16, dealerTotal: 17 },
    sombra: { outcome: "win", score: 10, playerTotal: 15, dealerTotal: 17 },
  },
  score: 0,
  chosenEv: 0.5,
  bestEv: 0.8,
  regret: 3,
};

describe("P2A consent and session-only records", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("declines without recording and keeps free play available", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.spyOn(Storage.prototype, "setItem");
    const onDecline = vi.fn();
    render(<StudyFlow profile={DF_SYM_01_3_TO_2} onDecline={onDecline} onExit={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /estudo local/i })).toBeInTheDocument();
    expect(screen.queryByText("Guia rápido · regras experimentais")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar composição/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Declinar e jogar livre/i }));
    expect(onDecline).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(Storage.prototype.setItem).not.toHaveBeenCalled();
  });

  it("records a completed round only after settlement, withdraws consent and clears data", async () => {
    vi.stubGlobal("crypto", webcrypto as Crypto);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<StudyFlow profile={DF_SYM_01_3_TO_2} onDecline={vi.fn()} onExit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Concordo e iniciar/i }));
    expect(await screen.findByText(/Familiarização · 1 de 3/i)).toBeInTheDocument();
    expect(screen.queryByText("Guia rápido · regras experimentais")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Registros consentidos")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: /Exportar JSON/i })).toBeDisabled();
    expect(screen.queryByText(/seed:|regret:|EV ótimo:/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Confirmar composição/i }));
    expect(screen.getByLabelText("Registros consentidos")).toHaveTextContent("0");
    expect(screen.queryByText(/seed:|regret:|EV ótimo:/i)).not.toBeInTheDocument();
    await finishCurrentRound(user);
    await waitFor(() => expect(screen.getByLabelText("Registros consentidos")).toHaveTextContent("1"));
    expect(screen.queryByText(/seed:|regret:|EV ótimo:/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Retirar consentimento/i }));
    expect(screen.getByRole("heading", { name: "Consentimento retirado" })).toBeInTheDocument();
    expect(screen.getByLabelText("Registros consentidos")).toHaveTextContent("1");
    expect(screen.queryByRole("button", { name: /Próxima rodada/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Apagar todos os dados/i }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Registros consentidos")).toHaveTextContent("0");
  });

  it("serializes completed records as safe JSON and formula-safe CSV", () => {
    const json = serializeJson([emptyRecord]);
    expect(JSON.parse(json).records[0].seed).toBe("=1+1");
    const csv = serializeCsv([emptyRecord]);
    expect(csv).toContain("'=1+1");
    expect(csv).not.toContain('"=1+1"');
    expect(csv).toContain("P2A-study-v1");
  });

  it("completes the three-stage 13-round protocol and offers only bounded questions", async () => {
    vi.stubGlobal("crypto", webcrypto as Crypto);
    const user = userEvent.setup();
    render(<StudyFlow profile={DF_SYM_01_3_TO_2} onDecline={vi.fn()} onExit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Concordo e iniciar/i }));
    for (let round = 0; round < 3; round += 1) {
      expect(await screen.findByText(new RegExp(`Familiarização · ${round + 1} de 3`))).toBeInTheDocument();
      await finishAndContinue(user);
    }

    expect(screen.getByRole("heading", { name: /Cartão didático opcional/i })).toBeInTheDocument();
    expect(screen.queryByText(/Atalho candidato, não regra canônica/i)).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: /Mostrar o cartão experimental/i }));
    expect(screen.getByText(/Atalho candidato, não regra canônica/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Praticar exemplo de ensino/i }));
    expect(await screen.findByText(/Exercício de ensino · 1 de 1/i)).toBeInTheDocument();
    await finishAndContinue(user);

    for (let round = 0; round < 9; round += 1) {
      expect(await screen.findByText(new RegExp(`Avaliação sem dicas · ${round + 1} de 9`))).toBeInTheDocument();
      expect(screen.queryByText(/Atalho candidato, não regra canônica/i)).toBeNull();
      await finishAndContinue(user);
    }
    expect(screen.getByRole("heading", { name: /Uma última impressão/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    await user.selectOptions(screen.getByRole("combobox", { name: /compreensão das regras/i }), "Compreendi as regras");
    await user.selectOptions(screen.getByRole("combobox", { name: /jogaria outra sessão/i }), "Talvez");
    await user.click(screen.getByRole("button", { name: /Salvar e continuar/i }));
    expect(await screen.findByRole("heading", { name: /Sessão encerrada/i })).toBeInTheDocument();
    expect(screen.getByText(/13 rodadas concluídas/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar CSV/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /Retirar consentimento/i }));
    expect(await screen.findByRole("heading", { name: "Consentimento retirado" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Exportar JSON/i }));
    expect(vi.mocked(downloadRecords)).toHaveBeenLastCalledWith("json", expect.any(Array), {});
  }, 120_000);
});
