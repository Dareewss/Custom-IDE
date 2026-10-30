type DesktopResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
interface CodeAtlasDesktop {
  readonly platform: string;
  readonly nativeGlass: boolean;
  setAppearance: (glass: boolean, transparency: number, theme: 'dark' | 'light') => void;
  minimize: () => void;
  toggleExpand: () => void;
  close: () => void;
  ready: () => void;
  onCloseRequested: (callback: () => void) => () => void;
  resize: (phase: 'start' | 'move' | 'end', edge: DesktopResizeEdge, x: number, y: number) => void;
}
interface Window {
  codeAtlasDesktop?: CodeAtlasDesktop;
}
