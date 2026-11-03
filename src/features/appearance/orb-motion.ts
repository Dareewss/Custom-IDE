export interface OrbHome {
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
}
export interface OrbPose {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
}
export const restingPose = (opacity: number): OrbPose => ({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity,
});
const wave = (time: number, frequency: number, phase: number) =>
  Math.sin(time * frequency + phase) - Math.sin(phase);
// Smooth seeded noise gives each orb new destinations without a looping timeline
// or fresh randomness per frame. Quintic interpolation keeps velocity continuous.
export function driftNoise(time: number, seed: number) {
  const cell = Math.floor(time);
  const fraction = time - cell;
  const ease = fraction ** 3 * (fraction * (fraction * 6 - 15) + 10);
  const hash = (point: number) => {
    const value = Math.sin(point * 127.1 + seed * 311.7) * 43758.5453;
    return (value - Math.floor(value)) * 2 - 1;
  };
  return hash(cell) * (1 - ease) + hash(cell + 1) * ease;
}
const softBound = (delta: number, center: number, extent: number, size: number) => {
  const room = Math.max(1, delta < 0 ? center + extent * 0.85 : size + extent * 0.85 - center);
  return room * Math.tanh(delta / room);
};

export function orbPose(
  time: number,
  index: number,
  home: OrbHome,
  viewport: { width: number; height: number },
  seed = 0,
): OrbPose {
  if (
    time <= 0 ||
    home.width <= 0 ||
    home.height <= 0 ||
    viewport.width <= 0 ||
    viewport.height <= 0
  )
    return restingPose(home.opacity);
  const frequency = (Math.PI * 2) / (61 + index * 7);
  const phase = index * 0.91 + 0.4;
  const wander = (channel: number, period: number) => {
    const key = (seed % 65521) + index * 13 + channel;
    const warp = (t: number) => t / period + 0.3 * driftNoise(t / 53, key + 71);
    return driftNoise(warp(time), key) - driftNoise(warp(0), key);
  };
  const scaleX =
    1 + 0.14 * Math.tanh(wave(time, frequency * Math.SQRT2, phase)) + 0.035 * wander(3, 23);
  const scaleY =
    1 -
    0.12 * Math.tanh(wave(time, frequency * Math.sqrt(3), phase + Math.PI / 2)) +
    0.03 * wander(4, 31);
  const rotation = 8 * wave(time, frequency / Math.sqrt(3), phase) + 3 * wander(5, 37);
  const angle = (rotation * Math.PI) / 180;
  const halfWidth = (home.width * scaleX) / 2;
  const halfHeight = (home.height * scaleY) / 2;
  const extentX = Math.hypot(halfWidth * Math.cos(angle), halfHeight * Math.sin(angle));
  const extentY = Math.hypot(halfWidth * Math.sin(angle), halfHeight * Math.cos(angle));
  const x =
    viewport.width *
    (0.04 * wave(time, frequency, phase) +
      0.015 * wave(time, frequency * Math.SQRT2, phase * 0.7) +
      0.055 * wander(1, 19));
  const y =
    viewport.height *
    (0.17 * wave(time, frequency * 0.91, phase) +
      0.055 * wave(time, frequency * Math.sqrt(3), phase * 0.7) +
      0.075 * wander(2, 29));
  return {
    x: softBound(x, home.left + home.width / 2, extentX, viewport.width),
    y: softBound(y, home.top + home.height / 2, extentY, viewport.height),
    scaleX,
    scaleY,
    rotation,
    opacity:
      home.opacity *
      (1 -
        0.04 *
          Math.abs(
            Math.sin(time * frequency * 0.7) * Math.sin(time * frequency * Math.SQRT2 + phase),
          )),
  };
}

export function blendPose(from: OrbPose, to: OrbPose, progress: number): OrbPose {
  if (progress <= 0) return { ...from };
  if (progress >= 1) return { ...to };
  return Object.fromEntries(
    (Object.keys(from) as (keyof OrbPose)[]).map((key) => [
      key,
      from[key] + (to[key] - from[key]) * progress,
    ]),
  ) as unknown as OrbPose;
}
