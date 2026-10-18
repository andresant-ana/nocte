// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DF_SYM_01_3_TO_2, partitions, type Card, type CardSource } from "@nocte/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameTable } from "./GameTable";
import { beginRound } from "./controller";
import type { PreparedRound } from "./random";

const card = (rank: Card["rank"]): Card => ({ rank });
const source = (cards: Card[]): CardSource => {
  let index = 0;
  return () => {
    const next = cards[index++];
    if (!next) throw new Error("draw lane exhausted");
    return next;
  };
};
const fixture = (initial: Card[], luz: Card[] = [], sombra: Card[] = [], dealer: Card[] = []) => ({
  seed: "game-table-test", index: 0, rules: DF_SYM_01_3_TO_2,
  initial: source(initial), draws: { luz: source(luz), sombra: source(sombra), dealer: source(dealer) },
}) satisfies PreparedRound;
function setup(initial = [card("5"), card("6"), card("8"), card("9"), card("6"), card("10")], luz = [card("10")], dealer = [card("5")]) {
  const active = beginRound(fixture(initial, luz, [], dealer));
  const onUpdate = vi.fn();
  const onNextRound = vi.fn();
  const onNewNight = vi.fn();
  const view = active.current;
  const session = active;
  return { active, onUpdate, onNextRound, onNewNight, render: () => render(<GameTable session={session} round={view} onRoundChange={onUpdate} roundNumber={1} nightScore={0} onNextRound={onNextRound} onNewNight={onNewNight} />) };
}

describe("solo game table", () => {
  afterEach(cleanup);
  it("lists engine composition choices, confirms Luz/Sombra and keeps hidden information private", async () => {
    const user = userEvent.setup();
    const { render: renderTable, onUpdate, onNextRound } = setup();
    renderTable();
    expect(screen.getByText(/Escolha quais cartas formam Luz e Sombra/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /composições disponíveis/i })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(partitions([card("5"), card("6"), card("8"), card("9")]).length);
    await user.click(screen.getByRole("radio", { name: /Composição 1/i }));
    await user.click(screen.getByRole("button", { name: /Confirmar composição/i }));
    const changed = onUpdate.mock.calls.at(-1)?.[0];
    expect(changed.phase).toBe("player");
    expect(changed).not.toHaveProperty("dealerHole");
    expect(screen.queryByText(/carta oculta|10 do dealer/i)).not.toBeInTheDocument();
  });

  it("offers only legal engine actions, resolves the dealer, shows outcomes and score, and starts a new round", async () => {
    const user = userEvent.setup();
    const { render: renderTable, onUpdate, onNextRound } = setup();
    renderTable();
    await user.click(screen.getByRole("button", { name: /Confirmar composição/i }));
    expect(screen.getByRole("button", { name: "Comprar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Parar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dobrar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dealer hole|carta oculta/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dobrar" }));
    expect(onUpdate.mock.calls.at(-1)?.[0].hands.luz.status).toBe("doubled");
    await user.click(screen.getByRole("button", { name: "Parar" }));
    expect(onUpdate.mock.calls.at(-1)?.[0].phase).toBe("dealer");
    await user.click(screen.getByRole("button", { name: /Resolver dealer/i }));
    expect(onUpdate.mock.calls.at(-1)?.[0].phase).toBe("complete");
    expect(screen.getByText(/Rodada concluída/i)).toBeInTheDocument();
    expect(screen.getByText(/Dealer.*10/i)).toBeInTheDocument();
    expect(screen.getByText(/Derrota/i)).toBeInTheDocument();
    expect(screen.getByText(/Pontuação da rodada: −10/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Placar da Noite")).toHaveTextContent("0");
    await user.click(screen.getByRole("button", { name: "Próxima rodada" }));
    expect(onNextRound).toHaveBeenCalledOnce();
  });

  it("supports keyboard selection and reveals a dealer natural only after composition settles", async () => {
    const user = userEvent.setup();
    const { render: renderTable, onUpdate } = setup([card("5"), card("6"), card("8"), card("9"), card("A"), card("10")], [], []);
    renderTable();
    const firstChoice = screen.getByRole("radio", { name: /Composição 1/i });
    firstChoice.focus();
    await user.keyboard(" ");
    await user.keyboard("{Tab}");
    await user.keyboard("{Enter}");
    expect(onUpdate.mock.calls.at(-1)?.[0].phase).toBe("complete");
    expect(screen.getByText(/natural do dealer/i)).toBeInTheDocument();
    expect(screen.getByText(/Dealer.*10/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Comprar" })).not.toBeInTheDocument();
  });

  it("shows a doubled bust and proceeds to the other hand", async () => {
    const user = userEvent.setup();
    const { render: renderTable, onUpdate } = setup(
      [card("6"), card("7"), card("8"), card("9"), card("4"), card("10")],
      [card("10")],
    );
    renderTable();
    await user.click(screen.getByRole("button", { name: /Confirmar composição/i }));
    await user.click(screen.getByRole("button", { name: "Dobrar" }));
    expect(onUpdate.mock.calls.at(-1)?.[0].hands.luz.status).toBe("busted");
    expect(onUpdate.mock.calls.at(-1)?.[0].currentHand).toBe("sombra");
    expect(screen.getByRole("button", { name: "Parar" })).toBeInTheDocument();
  });
});



