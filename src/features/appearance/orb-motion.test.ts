import { expect, it } from 'vitest';
import { blendPose, orbPose, restingPose, type OrbHome } from './orb-motion';

const home: OrbHome = { left: -80, top: -150, width: 400, height: 400, opacity: 0.95 };
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
