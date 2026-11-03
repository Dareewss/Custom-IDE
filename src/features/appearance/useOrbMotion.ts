import { useEffect, useRef, type RefObject } from 'react';
import { useSettings } from '../settings/store';
import { blendPose, orbPose, restingPose, type OrbPose } from './orb-motion';
import { useReducedMotionPreference } from './preferences';

export function useOrbMotion(ref: RefObject<HTMLDivElement | null>, visible: boolean) {
  const animation = useSettings((s) => s.backgroundAnimation);
  const orbs = useSettings((s) => s.backgroundBlobs);
  const speed = useSettings((s) => s.animationSpeed);
  const performanceMode = useSettings((s) => s.performanceMode);
  const preset = useSettings((s) => s.backgroundPreset);
  const reduced = useReducedMotionPreference();
  const phase = useRef(0);
  const poses = useRef<OrbPose[]>([]);
  const frames = useRef(0);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nodes = [...root.querySelectorAll<HTMLElement>('.scene-shape')];
    const baseOpacity = Number.parseFloat(
      getComputedStyle(root).getPropertyValue('--scene-shape-opacity'),
    );
    const readHomes = () =>
      nodes.map((node) => ({
        left: node.offsetLeft,
        top: node.offsetTop,
        width: node.offsetWidth,
        height: node.offsetHeight,
        opacity: baseOpacity,
      }));
    let homes = readHomes();
    const rest = () => homes.map((home) => restingPose(home.opacity));
    const publish = (mode: string, fps: number) => {
      root.dataset.motion = mode;
      root.dataset.orbFps = String(fps);
      root.dataset.orbPhase = phase.current.toFixed(4);
      root.dataset.orbFrames = String(frames.current);
    };
    const paint = (next: OrbPose[]) => {
      nodes.forEach((node, index) => {
        const pose = next[index];
        if (
          pose.x === 0 &&
          pose.y === 0 &&
          pose.scaleX === 1 &&
          pose.scaleY === 1 &&
          pose.rotation === 0
        )
          node.style.removeProperty('transform');
        else
          node.style.transform = `translate3d(${pose.x.toFixed(3)}px,${pose.y.toFixed(3)}px,0) rotate(${pose.rotation.toFixed(3)}deg) scale(${pose.scaleX.toFixed(5)},${pose.scaleY.toFixed(5)})`;
        node.style.opacity = String(pose.opacity);
      });
      poses.current = next;
      frames.current++;
      root.dataset.orbPhase = phase.current.toFixed(4);
      root.dataset.orbFrames = String(frames.current);
    };
    if (!poses.current.length) poses.current = rest();
    if (!visible || !orbs || reduced || performanceMode) {
      if (reduced || performanceMode || !animation) paint(rest());
      publish(!visible ? 'hidden' : !orbs ? 'orbs-off' : reduced ? 'reduced' : 'performance', 0);
      return;
    }
    const from = poses.current.map((pose) => ({ ...pose }));
    const start = performance.now();
    let lastPaint = start;
    let lastPhase = start;
    let frameId = 0;
    let alive = true;
    const resize = () => {
      homes = readHomes();
    };
    window.addEventListener('resize', resize);
    if (
      !animation &&
      from.every(
        (pose) =>
          pose.x === 0 &&
          pose.y === 0 &&
          pose.scaleX === 1 &&
          pose.scaleY === 1 &&
          pose.rotation === 0,
      )
    ) {
      paint(rest());
      publish('idle', 0);
      window.removeEventListener('resize', resize);
      return;
    }
    publish(animation ? 'running' : 'settling', 30);
    const tick = (now: number) => {
      if (!alive) return;
      if (now - lastPaint < 1000 / 30 - 0.01) {
        frameId = requestAnimationFrame(tick);
        return;
      }
      if (animation) phase.current += Math.min(0.1, Math.max(0, (now - lastPhase) / 1000)) * speed;
      lastPhase = now;
      lastPaint = now;
      const progress = Math.min(1, Math.max(0, (now - start) / 450));
      const ease = 1 - (1 - progress) ** 3;
      const target = animation
        ? homes.map((home, index) =>
            orbPose(phase.current, index, home, {
              width: window.innerWidth,
              height: window.innerHeight,
            }),
          )
        : rest();
      paint(
        target.map((pose, index) =>
          blendPose(from[index] ?? restingPose(pose.opacity), pose, ease),
        ),
      );
      if (!animation && progress >= 1) {
        publish('idle', 0);
        return;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, [ref, visible, animation, orbs, speed, performanceMode, preset, reduced]);
}
