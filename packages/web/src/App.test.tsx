// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("solo prototype landing", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("renders a local-only landing screen and experimental default profile", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "NOCTE" })).toBeInTheDocument();
    expect(screen.getByText(/jogo solo.*local/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar livre" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar estudo P2A" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /perfil experimental/i })).toHaveValue("DF-SYM-0.1-lab-infinite-3to2-peek-natural-first");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("locks the experimental profile during a Night and resets it only on a new Night", async () => {
    vi.stubGlobal("crypto", webcrypto as Crypto);
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole("combobox", { name: /perfil experimental/i }), "DF-SYM-0.1-lab-infinite-1to1-peek-natural-first");
    await user.click(screen.getByRole("button", { name: "Jogar livre" }));
    expect(await screen.findByRole("heading", { name: "Mesa Duas Faces" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /perfil experimental/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: /Confirmar composição/i }));
    for (let step = 0; step < 4 && screen.queryByRole("button", { name: "Parar" }); step += 1) {
      await user.click(screen.getByRole("button", { name: "Parar" }));
    }
    if (screen.queryByRole("button", { name: /Resolver dealer/i })) {
      await user.click(screen.getByRole("button", { name: /Resolver dealer/i }));
    }
    expect(screen.getByRole("region", { name: "Resultado da rodada" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Nova Noite" }));
    expect(await screen.findByRole("combobox", { name: "Modo de jogo" })).toHaveValue("basic");
    expect(screen.getByLabelText("Perfil experimental de regras")).toHaveValue("DF-SYM-0.1-lab-infinite-1to1-peek-natural-first");
  });

  it("lets players choose Cofre + Foco, payout and diagnostic horizon only before a new Night", async () => {
    vi.stubGlobal("crypto", webcrypto as Crypto);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Modo de jogo" }), "cofre-foco");
    await user.selectOptions(screen.getByRole("combobox", { name: /perfil experimental/i }), "DF-SYM-0.1-lab-infinite-1to1-peek-natural-first");
    await user.selectOptions(screen.getByRole("combobox", { name: /Duração da Noite/i }), "5");
    expect(screen.getAllByText(/diagnóstico/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Iniciar estudo P2A/i })).not.toBeInTheDocument();
    expect(screen.getByText(/P2A só está disponível no modo Duas Faces básico/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Jogar livre" }));
    expect(await screen.findByRole("heading", { name: /Duas Faces · Cofre \+ Foco/i })).toBeInTheDocument();
    expect(screen.getByText(/DF-CF-0.1-lab-infinite-1to1 · EXPERIMENTAL · natural 1:1/i)).toBeInTheDocument();
    expect(screen.getByText("3 de 3 restantes")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Modo de jogo" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Encerrar" }));
    expect(await screen.findByText(/Noite encerrada · recursos expirados/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Voltar à configuração" }));
    expect(screen.getByRole("combobox", { name: "Modo de jogo" })).toHaveValue("cofre-foco");
    await user.selectOptions(screen.getByRole("combobox", { name: "Modo de jogo" }), "basic");
    expect(screen.getByRole("button", { name: /Iniciar estudo P2A/i })).toBeInTheDocument();
  });

  it("keeps A0.1 as an explicit isolated mode, shows the 150/40 ledger, expires on abandon, and resets on a new Night", async () => {
    vi.stubGlobal("crypto", webcrypto as Crypto);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Modo de jogo" }), "bankroll-a0");
    expect(screen.getByText(/banca fictícia reiniciada em 150 fichas por noite/i)).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Duração da Noite/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Jogar livre" }));
    expect(await screen.findByRole("region", { name: "Banca fictícia A0.1" })).toBeInTheDocument();
    expect(screen.getByText("150 fichas")).toBeInTheDocument();
    expect(screen.getByText(/10\+10 · reserva 40 · disponível 110/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Encerrar" }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("saldo remanescente de 150 fichas fictícias"));
    expect(await screen.findByText(/Banca A0.1 expirada: 150 fichas fictícias/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Voltar à configuração" }));
    expect(screen.getByRole("combobox", { name: "Modo de jogo" })).toHaveValue("bankroll-a0");
    await user.click(screen.getByRole("button", { name: "Jogar livre" }));
    expect(await screen.findByText("150 fichas")).toBeInTheDocument();
    expect(screen.getByText(/10\+10 · reserva 40 · disponível 110/i)).toBeInTheDocument();
  });

  it("offers the P5 card identity laboratory without audiovisual controls", async () => {
    vi.stubGlobal("crypto", webcrypto as Crypto);
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Modo de jogo" }), "p5-cards");
    expect(screen.getByText(/Laboratório de cartas sem apostas ou banca/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Jogar livre" }));
    expect(await screen.findByRole("heading", { name: /Duas Faces · Cofre \+ Foco/i })).toBeInTheDocument();
    expect(screen.getByText(/Laboratório P5 de cartas · DF-CF-0.1-lab/i)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /som/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Carta do dealer fechada" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Modo de jogo" })).not.toBeInTheDocument();
  });

  it("shows the study consent briefing before logging and returns to unrecorded free play when declined", async () => {
    vi.stubGlobal("crypto", webcrypto as Crypto);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Iniciar estudo P2A" }));
    expect(screen.getByRole("heading", { name: "Estudo local" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar composição/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Declinar e jogar livre/i }));
    expect(await screen.findByRole("heading", { name: "Mesa Duas Faces" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Exportar JSON/i })).toBeNull();
  });
});
