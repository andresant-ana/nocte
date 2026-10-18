export class Moments {
  private n = 0;
  private mean = 0;
  private m2 = 0;
  add(value: number): void {
    const delta = value - this.mean;
    this.mean += delta / ++this.n;
    this.m2 += delta * (value - this.mean);
  }
  summary() {
    const variance = this.n > 1 ? this.m2 / (this.n - 1) : null;
    const standardError = variance === null ? null : Math.sqrt(variance / this.n);
    return { n: this.n, mean: this.mean, variance, standardError,
      confidence95: standardError === null ? null : [this.mean - 1.96 * standardError, this.mean + 1.96 * standardError] as const };
  }
}
