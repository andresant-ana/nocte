import { DF_SYM_01_3_TO_2, type Card, type CardSource, type RuleProfile } from "@nocte/engine";

export const BROWSER_STREAM_VERSION = "sha256-counter-rejection-v1";
export type BrowserLane = "initial" | "dealer" | "luz" | "sombra";
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;
const WORD_RANGE = 0x1_0000_0000;
const DRAW_BUFFER_SIZE = 64;

class CounterRandom {
  private counter = 0;
  private block = new Uint8Array(0);
  private offset = 0;

  constructor(private readonly seed: string, private readonly index: number, private readonly lane: BrowserLane) {}

  private async word(): Promise<number> {
    if (this.offset >= this.block.length) {
      const tuple = JSON.stringify([BROWSER_STREAM_VERSION, this.seed, this.index, this.lane, this.counter++]);
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
    return { ...card };
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
  draws: Readonly<Record<Exclude<BrowserLane, "initial">, CardSource>>;
}>;

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
