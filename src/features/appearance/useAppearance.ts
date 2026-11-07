import { useLayoutEffect } from 'react';
import { useSettings } from '../settings/store';
import { useUI } from '../../shared/ui-store';
import { useReducedTransparency } from './preferences';
import { materialAlphas } from './material';

export function useAppearance(host: Window = window) {
  const theme = useSettings((s) => s.theme);
  const transparency = useSettings((s) => s.backgroundTransparency);
  const preset = useSettings((s) => s.backgroundPreset);
  const blur = useSettings((s) => s.blurStrength);
  const blobs = useSettings((s) => s.backgroundBlobs);
  const animation = useSettings((s) => s.backgroundAnimation);
  const performanceMode = useSettings((s) => s.performanceMode);
  const desktopBlur = useSettings((s) => s.desktopBlur);
  const reducedTransparency = useReducedTransparency();
  useLayoutEffect(
    () => host.codeAtlasDesktop?.onDesktopBlurError?.(useUI.getState().reportError),
    [host],
  );
  useLayoutEffect(() => {
    const root = host.document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-preset', preset);
    root.setAttribute('data-blobs', String(blobs));
    root.setAttribute('data-animation', String(animation));
    root.setAttribute('data-performance', String(performanceMode));
    root.style.setProperty('--workspace-opacity', String((100 - transparency) / 100));
    root.style.setProperty('--glass-blur', `${blur}px`);
    const alphas = materialAlphas(transparency, theme);
    root.style.setProperty('--glass-bg-opacity', String(alphas.backing));
    root.style.setProperty('--glass-fg-tint', String(alphas.panel));
    root.style.setProperty('--glass-editor-tint', String(alphas.editor));
    root.style.setProperty('--glass-elevated-tint', String(alphas.elevated));
  }, [host, theme, transparency, preset, blur, blobs, animation, performanceMode]);
  useLayoutEffect(() => {
    host.codeAtlasDesktop?.setTheme(theme);
    if (host.codeAtlasDesktop?.supportsDesktopBlur)
      void host.codeAtlasDesktop
        .setDesktopBlur(desktopBlur && !performanceMode && !reducedTransparency)
        .catch(useUI.getState().reportError);
  }, [host, theme, performanceMode, desktopBlur, reducedTransparency]);
}
