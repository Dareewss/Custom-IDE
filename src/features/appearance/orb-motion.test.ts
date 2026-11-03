import { expect, it } from 'vitest';
import { blendPose, orbPose, restingPose, driftNoise, type OrbHome } from './orb-motion';

const home: OrbHome = { left: -80, top: -150, width: 400, height: 400, opacity: 0.95 };
it('uses smooth independent random destinations, continuous across noise cells', () => {
  for (let cell = 1; cell < 100; cell++) {
    const left = driftNoise(cell - 0.00001, 41),
      right = driftNoise(cell + 0.00001, 41);
    expect(Math.abs(left - right)).toBeLessThan(0.000001);
    expect(Math.abs(driftNoise(cell + 0.5, 41))).toBeLessThanOrEqual(1);
  }
  const view = { width: 1440, height: 960 };
  expect(orbPose(45, 1, home, view, 12)).not.toEqual(orbPose(45, 1, home, view, 91));
  expect(orbPose(0, 1, home, view, 91)).toEqual(restingPose(0.95));
  for (const time of [19, 29, 61, 600, 3600, 28800]) {
    const a = orbPose(time, 1, home, view, 91),
      b = orbPose(time + 0.001, 1, home, view, 91);
    expect(Math.abs(a.x - b.x)).toBeLessThan(0.1);
    expect(Math.abs(a.y - b.y)).toBeLessThan(0.1);
    expect(a).not.toEqual(orbPose(time + 600, 1, home, view, 91));
  }
});
it('starts at the unchanged home pose and does not reset on short or round time intervals', () => {
  expect(orbPose(0, 0, home, { width: 1440, height: 960 })).toEqual(restingPose(0.95));
  expect(orbPose(7, 0, home, { width: 1440, height: 960 })).not.toEqual(
    orbPose(14, 0, home, { width: 1440, height: 960 }),
  );
  expect(orbPose(600, 0, home, { width: 1440, height: 960 })).not.toEqual(restingPose(0.95));
});
it('keeps clipped orbs intersecting even compact viewports without changing their color inputs', () => {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 1440, height: 960 },
  ]) {
    for (let time = 0; time < 3600; time += 11) {
      const pose = orbPose(time, 2, home, viewport);
      const angle = (pose.rotation * Math.PI) / 180;
      const rx = Math.hypot(
        ((home.width * pose.scaleX) / 2) * Math.cos(angle),
        ((home.height * pose.scaleY) / 2) * Math.sin(angle),
      );
      const ry = Math.hypot(
        ((home.width * pose.scaleX) / 2) * Math.sin(angle),
        ((home.height * pose.scaleY) / 2) * Math.cos(angle),
      );
      const x = home.left + home.width / 2 + pose.x;
      const y = home.top + home.height / 2 + pose.y;
      expect(x + rx).toBeGreaterThan(0);
      expect(x - rx).toBeLessThan(viewport.width);
      expect(y + ry).toBeGreaterThan(0);
      expect(y - ry).toBeLessThan(viewport.height);
      expect(pose.opacity).toBeGreaterThanOrEqual(0.95 * 0.96);
      expect(pose.opacity).toBeLessThanOrEqual(0.95);
    }
  }
});
it('blends continuously and settles to an exact resting pose', () => {
  const from = orbPose(20, 1, home, { width: 1440, height: 960 });
  const rest = restingPose(0.95);
  expect(blendPose(from, rest, 0)).toEqual(from);
  expect(blendPose(from, rest, 1)).toEqual(rest);
  expect(blendPose(from, rest, 0.5).x).toBeCloseTo(from.x / 2);
});
