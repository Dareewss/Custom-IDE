import { expect, it } from 'vitest';
import { parseCamera, readCamera, writeCamera, type CameraState } from './camera-state';
const camera: CameraState = { position: [3, 4, 20], target: [1, 2, 0], near: 0.1, far: 10000 };
it('validates persisted camera vectors and clipping planes', () => {
  expect(parseCamera(camera)).toEqual(camera);
  for (const invalid of [
    null,
    {},
    { ...camera, position: [NaN, 1, 2] },
    { ...camera, target: ['3', 0, 0] },
    { ...camera, position: [1e8, 0, 0] },
    { ...camera, target: camera.position },
    { ...camera, near: 0 },
    { ...camera, far: Infinity },
    { ...camera, far: 0.01 },
  ])
    expect(parseCamera(invalid)).toBeNull();
});
it('keeps camera state isolated by project and recovers corrupt storage', () => {
  writeCamera('camera-a', camera);
  expect(readCamera('camera-a')).toEqual(camera);
  expect(readCamera('camera-b')).toBeNull();
  localStorage.setItem('atlas-overview-camera-v2-camera-a', '{broken');
  expect(readCamera('camera-a')).toBeNull();
});
