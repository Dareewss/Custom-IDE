type DesktopResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
interface DesktopGlassGeometry {
  displayId: string;
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
}
interface DesktopGlassSource extends DesktopGlassGeometry {
  sourceId: string;
  session: number;
}
interface CodeAtlasDesktop {
  readonly platform: string;
  readonly nativeGlass: boolean;
  copyScreenshot: () => Promise<void>;
  openGlassSource: () => Promise<DesktopGlassSource>;
  closeGlassSource: (session: number) => void;
  onGlassGeometry: (callback: (geometry: DesktopGlassGeometry) => void) => () => void;
  onGlassVisible: (callback: (visible: boolean) => void) => () => void;
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
