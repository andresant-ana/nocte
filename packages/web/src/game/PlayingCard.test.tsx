// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlayingCard } from "./PlayingCard";

describe("plain card identity display", () => {
  afterEach(cleanup);

  it("shows J/Q/K and four suits as readable, accessible identity without decorative artwork", () => {
    const { container, rerender } = render(<PlayingCard card={{ rank: "10", art: { faceRank: "J", suit: "hearts" } }} />);
    expect(screen.getByRole("img", { name: "Carta Valete de copas" })).toBeInTheDocument();
    expect(screen.getByText("J")).toBeInTheDocument();
    expect(screen.getByText("♥")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();

    rerender(<PlayingCard card={{ rank: "10", art: { faceRank: "Q", suit: "diamonds" } }} />);
    expect(screen.getByRole("img", { name: "Carta Dama de ouros" })).toBeInTheDocument();
    expect(screen.getByText("♦")).toBeInTheDocument();
    rerender(<PlayingCard card={{ rank: "10", art: { faceRank: "K", suit: "clubs" } }} />);
    expect(screen.getByRole("img", { name: "Carta Rei de paus" })).toBeInTheDocument();
    expect(screen.getByText("♣")).toBeInTheDocument();
    rerender(<PlayingCard card={{ rank: "A", art: { faceRank: "A", suit: "spades" } }} />);
    expect(screen.getByRole("img", { name: "Carta Ás de espadas" })).toBeInTheDocument();
    expect(screen.getByText("♠")).toBeInTheDocument();
  });
});
