import { DF_SYM_01_3_TO_2, type Card, type CardArt, type CardSource, type FaceRank, type Rank, type RuleProfile, type Suit } from "@nocte/engine";
import type { CofreFocoDraws } from "@nocte/engine/cofre-foco";

export const BROWSER_STREAM_VERSION = "sha256-counter-rejection-v1";
/** Independent display-only stream. It never consumes a game-rank word. */
export const P5_ART_STREAM_VERSION = "sha256-counter-p5-art-v1";
export type BrowserLane = "initial" | "dealer" | "luz" | "sombra" | "cofre";
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;
const FACE_TENS = ["10", "J", "Q", "K"] as const;
const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
const WORD_RANGE = 0x1_0000_0000;
const DRAW_BUFFER_SIZE = 64;

class CounterRandom {
  private counter = 0;
  private block = new Uint8Array(0);
  private offset = 0;

  constructor(private readonly seed: string, private readonly index: number, private readonly lane: string,
    private readonly streamVersion = BROWSER_STREAM_VERSION) {}

  private async word(): Promise<number> {
    if (this.offset >= this.block.length) {
      const tuple = JSON.stringify([this.streamVersion, this.seed, this.index, this.lane, this.counter++]);
      const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(tuple));
      this.block = new Uint8Array(digest);
      this.offset = 0;
    }
    const value = new DataView(this.block.buffer, this.block.byteOffset, this.block.byteLength).getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  async integer(maxExclusive: number): Promise<number> {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > WORD_RANGE) {
      throw new Error("Limite de sorteio inválido.");
    }
    const limit = Math.floor(WORD_RANGE / maxExclusive) * maxExclusive;
    let value: number;
    do { value = await this.word(); } while (value >= limit);
    return value % maxExclusive;
  }

  async card(): Promise<Card> {
    const rankIndex = await this.integer(13);
    return { rank: RANKS[Math.min(rankIndex, 9)]! };
  }

}

function source(cards: readonly Card[]): CardSource {
  let next = 0;
  return () => {
    const card = cards[next++];
    if (!card) throw new Error("A faixa de sorteio preparada se esgotou; inicie uma nova rodada.");
    return { ...card, ...(card.art ? { art: { ...card.art } } : {}) };
  };
}

async function cards(random: CounterRandom, count: number): Promise<Card[]> {
  const result: Card[] = [];
  for (let index = 0; index < count; index += 1) result.push(await random.card());
  return result;
}

export type PreparedRound = Readonly<{
  seed: string;
  index: number;
  rules: RuleProfile;
  initial: CardSource;
  draws: Readonly<Record<Exclude<BrowserLane, "initial" | "cofre">, CardSource>>;
}>;

export type PreparedCofreFocoRound = Readonly<{
  seed: string;
  index: number;
  draws: CofreFocoDraws & Readonly<{ luz: CardSource; sombra: CardSource }>;
}>;

/** Identity selection is a pure mapping from independently sampled buckets. */
export function p5ArtFromBuckets(rankBucket: number, faceBucket: number, suitBucket: number): CardArt {
  if (!Number.isInteger(rankBucket) || rankBucket < 0 || rankBucket >= 13) {
    throw new Error("Identidade de carta P5 fora do intervalo.");
  }
  return p5ArtForValueRank(RANKS[Math.min(rankBucket, 9)]!, faceBucket, suitBucket);
}

export function p5ArtForValueRank(rank: Rank, faceBucket: number, suitBucket: number): CardArt {
  if (!Number.isInteger(faceBucket) || faceBucket < 0 || faceBucket >= 4
    || !Number.isInteger(suitBucket) || suitBucket < 0 || suitBucket >= 4) {
    throw new Error("Identidade de carta P5 fora do intervalo.");
  }
  const faceRank: FaceRank = rank === "10" ? FACE_TENS[faceBucket]! : rank;
  return { faceRank, suit: SUITS[suitBucket]! };
}

async function cardsWithP5Art(seed: string, index: number, lane: BrowserLane, ranks: readonly Card[]): Promise<Card[]> {
  const art = new CounterRandom(seed, index, `p5-art:${lane}`, P5_ART_STREAM_VERSION);
  const output: Card[] = [];
  for (const card of ranks) {
    const artIdentity = p5ArtForValueRank(card.rank, await art.integer(4), await art.integer(4));
    output.push({ rank: card.rank, art: artIdentity });
  }
  return output;
}

/** Prepare named browser-safe streams before a synchronous engine transition begins. */
export async function prepareRound(
  seed: string,
  index: number,
  rules: RuleProfile = DF_SYM_01_3_TO_2,
): Promise<PreparedRound> {
  if (!seed || !Number.isSafeInteger(index) || index < 0) throw new Error("Cenário inválido.");
  if (!globalThis.crypto?.subtle) throw new Error("Este navegador não oferece SHA-256 seguro para preparar a rodada.");

  const [initial, luz, sombra, dealer] = await Promise.all([
    cards(new CounterRandom(seed, index, "initial"), 6),
    cards(new CounterRandom(seed, index, "luz"), DRAW_BUFFER_SIZE),
    cards(new CounterRandom(seed, index, "sombra"), DRAW_BUFFER_SIZE),
    cards(new CounterRandom(seed, index, "dealer"), DRAW_BUFFER_SIZE),
  ]);
  return {
    seed,
    index,
    rules,
    initial: source(initial),
    draws: { luz: source(luz), sombra: source(sombra), dealer: source(dealer) },
  };
}

/**
 * P2C pairing contract: four player cards and dealer up/hole are the same six
 * cards as P2A's `initial` lane. The experimental Cofre has its own lane, and
 * later dealer draws use a separate lane without re-drawing the hole.
 */
export async function prepareCofreFocoRound(seed: string, index: number): Promise<PreparedCofreFocoRound> {
  if (!seed || !Number.isSafeInteger(index) || index < 0) throw new Error("Cenário inválido.");
  if (!globalThis.crypto?.subtle) throw new Error("Este navegador não oferece SHA-256 seguro para preparar a rodada.");
  const [initialAndDealer, dealerDraws, cofre, luz, sombra] = await Promise.all([
    cards(new CounterRandom(seed, index, "initial"), 6),
    cards(new CounterRandom(seed, index, "dealer"), DRAW_BUFFER_SIZE),
    cards(new CounterRandom(seed, index, "cofre"), 1),
    cards(new CounterRandom(seed, index, "luz"), DRAW_BUFFER_SIZE),
    cards(new CounterRandom(seed, index, "sombra"), DRAW_BUFFER_SIZE),
  ]);
  return {
    seed,
    index,
    draws: {
      initial: source(initialAndDealer.slice(0, 4)),
      dealer: source([initialAndDealer[4]!, initialAndDealer[5]!, ...dealerDraws]),
      cofre: source(cofre),
      luz: source(luz),
      sombra: source(sombra),
    },
  };
}

/** P5 AV 0.1: same game-rank lanes and draws as P2C, plus isolated face/suit presentation metadata. */
export async function prepareP5CofreFocoRound(seed: string, index: number): Promise<PreparedCofreFocoRound> {
  if (!seed || !Number.isSafeInteger(index) || index < 0) throw new Error("Cenário inválido.");
  if (!globalThis.crypto?.subtle) throw new Error("Este navegador não oferece SHA-256 seguro para preparar a rodada.");
  const [initialRaw, dealerRaw, cofreRaw, luzRaw, sombraRaw] = await Promise.all([
    cards(new CounterRandom(seed, index, "initial"), 6),
    cards(new CounterRandom(seed, index, "dealer"), DRAW_BUFFER_SIZE),
    cards(new CounterRandom(seed, index, "cofre"), 1),
    cards(new CounterRandom(seed, index, "luz"), DRAW_BUFFER_SIZE),
    cards(new CounterRandom(seed, index, "sombra"), DRAW_BUFFER_SIZE),
  ]);
  const [initialAndDealer, dealerDraws, cofre, luz, sombra] = await Promise.all([
    cardsWithP5Art(seed, index, "initial", initialRaw), cardsWithP5Art(seed, index, "dealer", dealerRaw),
    cardsWithP5Art(seed, index, "cofre", cofreRaw), cardsWithP5Art(seed, index, "luz", luzRaw),
    cardsWithP5Art(seed, index, "sombra", sombraRaw),
  ]);
  return { seed, index, draws: {
    initial: source(initialAndDealer.slice(0, 4)),
    dealer: source([initialAndDealer[4]!, initialAndDealer[5]!, ...dealerDraws]),
    cofre: source(cofre), luz: source(luz), sombra: source(sombra),
  } };
}
