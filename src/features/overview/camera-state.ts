import type { Vec3 } from '../../core/model/layout/types';
export interface CameraState {
  position: Vec3;
  target: Vec3;
  near: number;
  far: number;
}
export function parseCamera(value: unknown): CameraState | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const vector = (v: unknown): v is Vec3 =>
    Array.isArray(v) &&
    v.length === 3 &&
    v.every((n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e7);
  if (
    !vector(data.position) ||
    !vector(data.target) ||
    Math.hypot(...data.position.map((n, i) => n - (data.target as Vec3)[i])) < 0.01 ||
    typeof data.near !== 'number' ||
    !Number.isFinite(data.near) ||
    data.near <= 0 ||
    typeof data.far !== 'number' ||
    !Number.isFinite(data.far) ||
    data.far <= data.near ||
    data.far > 1e9
  )
    return null;
  return { position: data.position, target: data.target, near: data.near, far: data.far };
}
export function readCamera(projectId: string): CameraState | null {
  try {
    return parseCamera(
      JSON.parse(localStorage.getItem(`atlas-overview-camera-${projectId}`) ?? 'null'),
    );
  } catch {
    return null;
  }
}
export function writeCamera(projectId: string, state: CameraState): void {
  const parsed = parseCamera(state);
  if (parsed) localStorage.setItem(`atlas-overview-camera-${projectId}`, JSON.stringify(parsed));
}
