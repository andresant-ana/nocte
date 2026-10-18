import { createHash } from "node:crypto";
import type { Card } from "@nocte/engine";
import { RANKS } from "./solver.js";

export const STREAM_VERSION = "sha256-counter-rejection-v1";
export type Lane = "initial" | "dealer" | "luz" | "sombra" | "cofre" | "choice";
/** Lab-only domain-separated counter streams; never sent to a player decision policy. */
export class BenchmarkRandom {
  private counter = 0;
  private block = Buffer.alloc(0);
  private offset = 0;
  constructor(private seed: string, private scenarioIndex: number, private lane: Lane) {}
  private word(): number {
    if (this.offset >= this.block.length) {
      this.block = createHash("sha256").update(JSON.stringify([STREAM_VERSION, this.seed, this.scenarioIndex, this.lane, this.counter++])).digest();
      this.offset = 0;
    }
    const value = this.block.readUInt32LE(this.offset); this.offset += 4;
    return value;
  }
  integer(maxExclusive: number): number {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 0x1_0000_0000) throw new Error("Invalid integer sampling bound.");
    const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
    let word: number;
    do { word = this.word(); } while (word >= limit);
    return word % maxExclusive;
  }
  card(): Card {
    const index = this.integer(13);
    return { rank: RANKS[Math.min(index, 9)]! };
  }
}
export type InitialScenario = { cards: readonly Card[]; up: Card; hole: Card };
export function scenario(seed: string, index: number): InitialScenario {
  const random = new BenchmarkRandom(seed, index, "initial");
  return { cards: Array.from({ length: 4 }, () => random.card()), up: random.card(), hole: random.card() };
}
