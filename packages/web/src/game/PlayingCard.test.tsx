// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardBack, PlayingCard } from "./PlayingCard";

describe("original P5 playing-card artwork", () => {
  afterEach(cleanup);

  it("renders distinct authored SVG portraits for Jack, Queen and King with suit-aware accessible labels", () => {
    const { container, rerender } = render(<PlayingCard card={{ rank: "10", art: { faceRank: "J", suit: "hearts" } }} />);
    expect(screen.getByRole("img", { name: "Carta Valete de copas" })).toBeInTheDocument();
    expect(container.querySelector("svg.face-j")).toBeInTheDocument();
    rerender(<PlayingCard card={{ rank: "10", art: { faceRank: "Q", suit: "diamonds" } }} />);
    expect(container.querySelector("svg.face-q")).toBeInTheDocument();
    rerender(<PlayingCard card={{ rank: "10", art: { faceRank: "K", suit: "clubs" } }} />);
    expect(container.querySelector("svg.face-k")).toBeInTheDocument();
  });

  it("renders the NOCTE back as a decorative but named image", () => {
    const { container } = render(<CardBack />);
    expect(screen.getByRole("img", { name: "Carta do dealer fechada" })).toBeInTheDocument();
    expect(container.querySelector("svg text")?.textContent).toBe("N");
  });
});
