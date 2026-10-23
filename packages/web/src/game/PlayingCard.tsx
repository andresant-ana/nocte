import type { Card, FaceRank, Suit } from "@nocte/engine";

const suitGlyph: Record<Suit, string> = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };
const suitName: Record<Suit, string> = { spades: "espadas", hearts: "copas", diamonds: "ouros", clubs: "paus" };
const faceName: Record<FaceRank, string> = { J: "Valete", Q: "Dama", K: "Rei", A: "Ás", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9", "10": "10" };

/** Plain, accessible rank/suit display for the gameplay laboratory. */
export function PlayingCard({ card, label }: { card: Card; label?: string }) {
  const rank = card.art?.faceRank ?? card.rank;
  const suit = card.art?.suit;
  const red = suit === "hearts" || suit === "diamonds";
  const ariaLabel = label ?? `Carta ${faceName[rank]}${suit ? ` de ${suitName[suit]}` : ""}`;
  return <span className={`playing-card identity-card${red ? " red-suit" : ""}`} role="img" aria-label={ariaLabel}>
    <span aria-hidden="true">{rank}</span>{suit && <span className="card-suit" aria-hidden="true">{suitGlyph[suit]}</span>}
  </span>;
}
