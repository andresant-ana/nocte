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
    expect(screen.getByRole("button", { name: "Iniciar estudo" })).toBeInTheDocument();
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
    expect(await screen.findByText(/NOITE · RODADA 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Placar da Noite")).toHaveTextContent("0");
    expect(screen.queryByRole("combobox", { name: /perfil experimental/i })).toBeNull();
  });

  it("shows the study consent briefing before logging and returns to unrecorded free play when declined", async () => {
    vi.stubGlobal("crypto", webcrypto as Crypto);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Iniciar estudo" }));
    expect(screen.getByRole("heading", { name: "Estudo local" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar composição/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Declinar e jogar livre/i }));
    expect(await screen.findByRole("heading", { name: "Mesa Duas Faces" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Exportar JSON/i })).toBeNull();
  });
});
