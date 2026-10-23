// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { Card, CardSource } from "@nocte/engine";
import { CF_LAB_01_3_TO_2 } from "@nocte/engine/cofre-foco";
import { BankrollA0SessionAdapter } from "./bankroll-a0-session";
import { CofreFocoTable } from "./CofreFocoTable";
import type { PreparedCofreFocoRound } from "./random";
import * as React from "react";

const card = (rank: Card["rank"]): Card => ({ rank });
const source = (cards: readonly Card[]): CardSource => {
  let index = 0;
  return () => {
    const next = cards[index++];
    if (!next) throw new Error("test draw lane exhausted");
    return { ...next };
  };
};
const prepared = (index: number): PreparedCofreFocoRound => ({
  seed: "browser-practice", index,
  draws: {
    initial: source([card("8"), card("8"), card("8"), card("8")]),
    dealer: source([card("6"), card("10"), card("10")]),
    cofre: source([card("5")]),
    luz: source([card("10")]),
    sombra: source([card("10")]),
  },
});
function loseRound(session: BankrollA0SessionAdapter) {
  session.compose({ luz: [0, 1], sombra: [2, 3] });
  session.skipRead();
  session.skipManeuver();
  session.continueAfterAbilities();
  session.act("double");
  session.act("double");
  session.resolveDealer();
}

describe("A0.1 bankroll table practice state", () => {
  afterEach(cleanup);

  it("keeps gameplay and match points active while the practice bank is frozen", async () => {
    const user = userEvent.setup();
    const controller = BankrollA0SessionAdapter.start(prepared(0), CF_LAB_01_3_TO_2, "bankroll-ui-practice");
    for (let loss = 0; loss < 3; loss += 1) {
      loseRound(controller);
      if (loss < 2) controller.nextRound(prepared(loss + 1));
    }
    controller.nextRound(prepared(3));

    function Harness() {
      const [night, setNight] = React.useState(controller.current);
      const [bankroll, setBankroll] = React.useState(controller.bankroll);
      return <CofreFocoTable session={controller} night={night} rules={CF_LAB_01_3_TO_2} bankroll={bankroll}
        onNightChange={next => { setNight(next); setBankroll(controller.bankroll); }}
        onNextRound={() => { const next = controller.nextRound(prepared(controller.current.completedRounds)); setNight(next); setBankroll(controller.bankroll); }}
        onReturnToSetup={() => undefined} />;
    }
    render(<Harness />);
    expect(screen.getByRole("region", { name: "Banca fictícia A0.1" })).toHaveTextContent("30 fichas");
    expect(within(screen.getByRole("region", { name: "Banca fictícia A0.1" })).getByText("Saldo congelado até o fim da Noite")).toBeInTheDocument();
    expect(screen.getByText("−120")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar composição" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Confirmar composição" }));
    await user.click(screen.getByRole("button", { name: "Conservar Foco" }));
    await user.click(screen.getAllByRole("button", { name: "Dobrar" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "Dobrar" })[0]!);
    await user.click(screen.getByRole("button", { name: "Resolver dealer" }));
    expect(screen.getByRole("region", { name: "Banca fictícia A0.1" })).toHaveTextContent("30 fichas");
    expect(screen.getByText("−160")).toBeInTheDocument();
    expect(screen.getByText(/variação da banca nesta rodada: 0 fichas \(banca congelada em prática\)/i)).toBeInTheDocument();
  });
});
