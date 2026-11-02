import { useLayoutEffect } from 'react';
import { useSettings } from '../settings/store';

export function useAppearance() {
  const theme = useSettings((s) => s.theme);
  const transparency = useSettings((s) => s.backgroundTransparency);
  const preset = useSettings((s) => s.backgroundPreset);
  const blur = useSettings((s) => s.blurStrength);
  const blobs = useSettings((s) => s.backgroundBlobs);
  const animation = useSettings((s) => s.backgroundAnimation);
  const performanceMode = useSettings((s) => s.performanceMode);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.preset = preset;
    root.dataset.blobs = String(blobs);
    root.dataset.animation = String(animation);
    root.dataset.performance = String(performanceMode);
    root.style.setProperty('--workspace-opacity', String((100 - transparency) / 100));
    root.style.setProperty('--glass-blur', `${blur}px`);
    window.codeAtlasDesktop?.setTheme(theme);
  }, [theme, transparency, preset, blur, blobs, animation, performanceMode]);
}
