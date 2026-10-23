import type { Card, Suit } from "@nocte/engine";

const suitGlyph: Record<Suit, string> = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };
const suitName: Record<Suit, string> = { spades: "espadas", hearts: "copas", diamonds: "ouros", clubs: "paus" };
const faceName: Record<"J" | "Q" | "K", string> = { J: "Valete", Q: "Dama", K: "Rei" };
const redSuits = new Set<Suit>(["hearts", "diamonds"]);

function Figure({ rank, suit }: { rank: "J" | "Q" | "K"; suit: Suit }) {
  const red = redSuits.has(suit);
  const accent = red ? "#9b3e3d" : "#176b5e";
  const glyph = suitGlyph[suit];
  return <svg className={`face-portrait face-${rank.toLowerCase()}`} viewBox="0 0 84 112" aria-hidden="true" focusable="false">
    <path d="M4 4h76v104H4z" fill="#eee5d3" stroke="#b89554" strokeWidth="2" />
    <path d="M10 10h64v92H10z" fill="none" stroke="#233b35" strokeWidth="1" />
    <path d="M13 26 42 12 71 26 65 35H19z" fill={accent} />
    <path d="M18 37q24-12 48 0l-5 35H23z" fill="#17231f" />
    <path d="M25 44q17-11 34 0v12H25z" fill="#dfbd78" />
    <path d="M25 70h34l9 20H16z" fill={rank === "K" ? "#9a7540" : rank === "Q" ? "#6c3437" : "#31554c"} />
    {rank === "K" && <path d="m27 23 5-14 10 9 10-9 5 14" fill="#d2b46f" stroke="#6e5532" strokeWidth="2" />}
    {rank === "Q" && <path d="M24 23q18-25 36 0M28 18l-6-8m34 8 6-8" fill="none" stroke="#d2b46f" strokeWidth="3" />}
    {rank === "J" && <path d="M25 18q17-14 34 0M30 21h24" fill="none" stroke="#d2b46f" strokeWidth="3" />}
    <path d="M30 51h7m10 0h7" stroke="#17231f" strokeWidth="2" />
    <path d="M35 63q7 4 14 0" fill="none" stroke="#f0dcae" strokeWidth="2" />
    <text x="42" y="99" textAnchor="middle" fill={accent} fontFamily="Georgia,serif" fontSize="12" fontWeight="700">{glyph} · {rank}</text>
  </svg>;
}

export function PlayingCard({ card, label }: { card: Card; label?: string }) {
  const rank = card.art?.faceRank ?? card.rank;
  const suit = card.art?.suit;
  const glyph = suit ? suitGlyph[suit] : "";
  const red = suit ? redSuits.has(suit) : false;
  const announcedRank = rank === "J" || rank === "Q" || rank === "K" ? faceName[rank] : rank;
  return <span className={`playing-card p5-playing-card${suit ? ` suit-${suit}${red ? " red-suit" : ""}` : ""}`}
    role="img" aria-label={label ?? `Carta ${announcedRank}${suit ? ` de ${suitName[suit]}` : ""}`}>
    <span className="card-index" aria-hidden="true">{rank}{glyph && <small>{glyph}</small>}</span>
    {rank === "J" || rank === "Q" || rank === "K"
      ? <Figure rank={rank} suit={suit ?? "spades"} />
      : <span className="card-center" aria-hidden="true">{glyph || rank}</span>}
    <span className="card-index card-index-bottom" aria-hidden="true">{rank}{glyph && <small>{glyph}</small>}</span>
  </span>;
}

export function CardBack({ label = "Carta do dealer fechada" }: { label?: string }) {
  return <span className="playing-card p5-playing-card p5-card-back" role="img" aria-label={label}>
    <svg viewBox="0 0 100 140" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="92" height="132" rx="4" fill="#102a25" stroke="#c5a363" strokeWidth="3" />
      <rect x="11" y="11" width="78" height="118" fill="none" stroke="#d8c28e" strokeWidth="1" />
      <path d="M50 17 82 70 50 123 18 70z" fill="none" stroke="#c5a363" strokeWidth="2" />
      <path d="M50 31 70 70 50 109 30 70z" fill="#173d34" stroke="#d8c28e" strokeWidth="1" />
      <circle cx="50" cy="70" r="9" fill="#c5a363" />
      <path d="M50 46v48M26 70h48" stroke="#d8c28e" strokeWidth="1" />
      <text x="50" y="75" textAnchor="middle" fill="#102a25" fontFamily="Georgia,serif" fontSize="7" fontWeight="700">N</text>
    </svg>
  </span>;
}
