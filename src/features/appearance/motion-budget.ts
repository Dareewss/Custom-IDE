import { create } from 'zustand';
import type { OrbFps } from './frame-budget';

export const useMotionBudget = create<{ fps: OrbFps }>(() => ({ fps: 30 }));
export const retryOrbMotion = () => useMotionBudget.setState({ fps: 30 });
