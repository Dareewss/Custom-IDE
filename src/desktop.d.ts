type DesktopResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
interface CodeAtlasDesktop {
  readonly platform: string;
  readonly supportsDesktopBlur: boolean;
  setDesktopBlur: (enabled: boolean) => Promise<boolean>;
  onDesktopBlurError?: (callback: (message: string) => void) => () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  minimize: () => void;
  focus: () => void;
  toggleExpand: () => void;
  close: () => void;
  ready: () => void;
  onCloseRequested: (callback: () => void) => () => void;
  onVisibilityChanged: (callback: (visible: boolean) => void) => () => void;
  resize: (phase: 'start' | 'move' | 'end', edge: DesktopResizeEdge, x: number, y: number) => void;
}
interface Window {
  codeAtlasDesktop?: CodeAtlasDesktop;
}
