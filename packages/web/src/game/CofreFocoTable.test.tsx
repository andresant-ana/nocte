// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Card, CardSource } from "@nocte/engine";
import { CF_LAB_01_3_TO_2 } from "@nocte/engine/cofre-foco";
import { CofreFocoSessionAdapter } from "./cofre-foco-session";
import { CofreFocoTable } from "./CofreFocoTable";
import type { PreparedCofreFocoRound } from "./random";

const card = (rank: Card["rank"]): Card => ({ rank });
const source = (cards: readonly Card[]): CardSource => {
  let index = 0;
  return () => {
    const next = cards[index++];
    if (!next) throw new Error("test draw lane exhausted");
    return { ...next };
  };
};
const prepared = (initial = [card("A"), card("6"), card("8"), card("9")], dealer = [card("6"), card("10"), card("5")], cofre = card("10")): PreparedCofreFocoRound => ({
  seed: "cofre-table-private-seed", index: 0,
  draws: { initial: source(initial), dealer: source(dealer), cofre: source([cofre]), luz: source([card("2")]), sombra: source([card("2")]) },
});

function setupRound(options?: { initial?: Card[]; dealer?: Card[]; cofre?: Card }) {
  const controller = CofreFocoSessionAdapter.start(prepared(options?.initial, options?.dealer, options?.cofre), CF_LAB_01_3_TO_2, 2);
  const onNextRound = vi.fn();
  const onReturnToSetup = vi.fn();
  function Harness() {
    const [night, setNight] = React.useState(controller.current);
    return <CofreFocoTable session={controller} night={night} rules={CF_LAB_01_3_TO_2} onNightChange={setNight}
      onNextRound={onNextRound} onReturnToSetup={onReturnToSetup} />;
  }
  return { controller, onNextRound, onReturnToSetup, render: () => render(<Harness />) };
}

import * as React from "react";

describe("Cofre + Foco solo table", () => {
  afterEach(cleanup);

  it("shows the fifth open card, confirms private Read before spending, and keeps future dealer draws hidden", async () => {
    const user = userEvent.setup();
    const { render: renderTable } = setupRound();
    renderTable();
    expect(screen.getByText(/EXPERIMENTAL · natural 3:2/i)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Quatro cartas iniciais" }).children).toHaveLength(4);
    expect(screen.getByRole("list", { name: "Carta do Cofre" })).toHaveTextContent("10");
    await user.click(screen.getByRole("button", { name: "Confirmar composição" }));
    expect(screen.getByRole("heading", { name: "Janela de Foco" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cartas visíveis do dealer").querySelectorAll("[aria-label^='Carta']")).toHaveLength(2);
    expect(screen.queryByLabelText(/Carta lida/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Escolher Leitura" }));
    expect(screen.getByRole("dialog", { name: "Confirmar Leitura" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByText("3 de 3 restantes")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Carta lida/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Escolher Leitura" }));
    await user.click(screen.getByRole("button", { name: "Confirmar gasto" }));
    expect(screen.getByText("1 de 3 restantes")).toBeInTheDocument();
    expect(screen.getByLabelText("Cartas visíveis do dealer").querySelectorAll("[aria-label^='Compra do dealer']")).toHaveLength(0);
    expect(screen.getByText(/Leitura privada usada: a hole é 10/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar sem Manobra" }));
    expect(screen.getByRole("button", { name: "Comprar" })).toBeInTheDocument();
  });

  it("previews and confirms a legal Manobra, treats swapped Ace+10 as ordinary 21, and keeps the hand terminal", async () => {
    const user = userEvent.setup();
    const { render: renderTable } = setupRound();
    renderTable();
    await user.click(screen.getByRole("button", { name: "Confirmar composição" }));
    await user.click(screen.getByRole("button", { name: "Pular Leitura" }));
    await user.click(screen.getByRole("button", { name: "Luz · carta 2 (6)" }));
    expect(screen.getByText(/Luz: 6 → 10; Cofre receberá 6/i)).toBeInTheDocument();
    expect(screen.getByText(/21 comum.*para automaticamente/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Pré-visualizar Manobra/i }));
    expect(screen.getByRole("dialog", { name: "Confirmar Manobra" })).toBeInTheDocument();
    expect(screen.getByText(/A carta retirada ficará no Cofre/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar gasto" }));
    expect(screen.getByText("2 de 3 restantes")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Carta do Cofre" })).toHaveTextContent("6");
    expect(screen.getByText(/21 comum por Manobra/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar às mãos" }));
    expect(screen.getByRole("heading", { name: "Luz" }).parentElement).toHaveTextContent("Estado: parou");
    expect(screen.getByRole("group", { name: "Ações para Sombra" })).toBeInTheDocument();
  });

  it("skips the Focus window after dealer natural and keeps the quick guide non-strategic and keyboard-accessible", async () => {
    const user = userEvent.setup();
    const { render: renderTable } = setupRound({ dealer: [card("A"), card("10")] });
    renderTable();
    const guide = screen.getByText("Guia rápido · regras Cofre + Foco (experimentais)");
    guide.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("region", { name: "Guia rápido Cofre + Foco" })).toBeInTheDocument();
    expect(screen.getByText(/quinta carta fica aberta e separada no Cofre/i)).toBeInTheDocument();
    expect(screen.queryByText(/jogada ótima|valor esperado|arrependimento/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar composição" }));
    expect(screen.queryByRole("heading", { name: "Janela de Foco" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Escolher Leitura|Pré-visualizar Manobra/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Natural do dealer: a rodada terminou pelo peek/i)).toBeInTheDocument();
    expect(screen.getByText("3 de 3 restantes")).toBeInTheDocument();
  });
});
