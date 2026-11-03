import { useLayoutEffect } from 'react';
import { useSettings } from '../settings/store';
import { useUI } from '../../shared/ui-store';
import { useReducedTransparency } from './preferences';
import { materialAlphas } from './material';

export function useAppearance() {
  const theme = useSettings((s) => s.theme);
  const transparency = useSettings((s) => s.backgroundTransparency);
  const preset = useSettings((s) => s.backgroundPreset);
  const blur = useSettings((s) => s.blurStrength);
  const blobs = useSettings((s) => s.backgroundBlobs);
  const animation = useSettings((s) => s.backgroundAnimation);
  const performanceMode = useSettings((s) => s.performanceMode);
  const desktopBlur = useSettings((s) => s.desktopBlur);
  const reducedTransparency = useReducedTransparency();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.preset = preset;
    root.dataset.blobs = String(blobs);
    root.dataset.animation = String(animation);
    root.dataset.performance = String(performanceMode);
    root.style.setProperty('--workspace-opacity', String((100 - transparency) / 100));
    root.style.setProperty('--glass-blur', `${blur}px`);
    const alphas = materialAlphas(transparency, theme);
    root.style.setProperty('--glass-bg-opacity', String(alphas.backing));
    root.style.setProperty('--glass-fg-tint', String(alphas.panel));
    root.style.setProperty('--glass-editor-tint', String(alphas.editor));
    root.style.setProperty('--glass-elevated-tint', String(alphas.elevated));
  }, [theme, transparency, preset, blur, blobs, animation, performanceMode]);
  useLayoutEffect(() => {
    window.codeAtlasDesktop?.setTheme(theme);
    if (window.codeAtlasDesktop?.supportsDesktopBlur)
      void window.codeAtlasDesktop
        .setDesktopBlur(desktopBlur && !performanceMode && !reducedTransparency)
        .catch(useUI.getState().reportError);
  }, [theme, performanceMode, desktopBlur, reducedTransparency]);
}
