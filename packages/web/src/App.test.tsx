// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("solo prototype landing", () => {
  it("renders a local-only landing screen and experimental default profile", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "NOCTE" })).toBeInTheDocument();
    expect(screen.getByText(/jogo solo.*local/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jogar livre" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar estudo" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /perfil experimental/i })).toHaveValue("DF_SYM_01_3_TO_2");
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});

