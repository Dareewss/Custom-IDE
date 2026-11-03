export type OrbFps = 30 | 15 | 0;

/** Observe raw display intervals, not the deliberately throttled paint intervals. */
export class FrameBudget {
  private samples = 0;
  private total = 0;
  sample(interval: number, renderCost: number, fps: OrbFps): OrbFps {
    if (!Number.isFinite(interval) || interval <= 0 || interval > 250 || fps === 0) return fps;
    this.total += Math.max(interval, renderCost);
    if (++this.samples < 30) return fps;
    const slow = this.total / this.samples > 20;
    this.samples = 0;
    this.total = 0;
    return slow ? (fps === 30 ? 15 : 0) : fps;
  }
}
