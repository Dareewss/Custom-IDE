import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useReducedMotion } from 'motion/react';
import { useSettings } from '../settings/store';
import { createGlassRenderer } from './glass-renderer';
const panes = '.titlebar,.activitybar,.sidebar,.editor-card,.output-card';
const reducedQuery = '(prefers-reduced-transparency: reduce)';
const subscribeReduced = (notify: () => void) => {
  const media = window.matchMedia(reducedQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};

export function LiveGlass() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const glass = useSettings((s) => s.glassEffect);
  const transparency = useSettings((s) => s.backgroundTransparency);
  const theme = useSettings((s) => s.theme);
  const current = useRef({ transparency, theme });
  const [error, setError] = useState('');
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    current.current = { transparency, theme };
  }, [transparency, theme]);
  const enabled = Boolean(
    window.codeAtlasDesktop?.nativeGlass &&
    glass &&
    !reduced &&
    transparency > 0 &&
    transparency < 100,
  );
  useEffect(() => {
    const native = window.codeAtlasDesktop;
    const element = canvas.current;
    if (!enabled || !native || !element) return;
    let disposed = false,
      frame = 0,
      lastFrame = 0,
      source: DesktopGlassSource | undefined;
    let stream: MediaStream | undefined;
    let renderer: ReturnType<typeof createGlassRenderer> | undefined;
    const video = document.createElement('video');
    video.muted = true;
    let geometry: DesktopGlassGeometry | undefined;
    let light: [number, number] = [-1000, -1000];
    let visible = true;
    let starting = false;
    const pointer = (event: PointerEvent) => {
      if (!reducedMotion) light = [event.clientX, event.clientY];
    };
    const paint = (time: number) => {
      if (disposed) return;
      if (
        geometry &&
        visible &&
        !starting &&
        stream?.getVideoTracks()[0]?.readyState === 'live' &&
        time - lastFrame > 40
      ) {
        renderer?.draw(video, geometry, current.current.transparency, light, current.current.theme);
        if (video.readyState >= 2) document.documentElement.dataset.opticalGlass = 'ready';
        lastFrame = time;
      }
      frame = requestAnimationFrame(paint);
    };
    const resize = new ResizeObserver(() => renderer?.layout());
    const observe = () => {
      document.querySelectorAll(panes).forEach((node) => resize.observe(node));
      renderer?.layout();
    };
    const mutation = new MutationObserver((records) => {
      if (
        records.some((record) =>
          [...record.addedNodes, ...record.removedNodes].some(
            (node) => node instanceof Element && (node.matches(panes) || node.querySelector(panes)),
          ),
        )
      )
        observe();
    });
    const unsubscribe = native.onGlassGeometry((next) => {
      if (geometry && next.displayId !== geometry.displayId) {
        // Restart the screen source on monitor changes, preserving its current coordinates.
        stream?.getTracks().forEach((track) => track.stop());
        document.documentElement.dataset.opticalGlass = 'monitor-change';
        void start().catch(fail);
      } else geometry = next;
    });
    const unsubscribeVisible = native.onGlassVisible((next) => {
      visible = next;
      if (!next) {
        document.documentElement.dataset.opticalGlass = 'paused';
        stream?.getTracks().forEach((track) => track.stop());
        if (source) native.closeGlassSource(source.session);
      } else void start().catch(fail);
    });
    const fail = (reason: unknown) => {
      if (!disposed) {
        setError(String(reason));
        document.documentElement.dataset.opticalGlass = 'error';
        stream?.getTracks().forEach((track) => track.stop());
        if (source) native.closeGlassSource(source.session);
      }
    };
    const start = async () => {
      if (starting || disposed || !visible) return;
      starting = true;
      try {
        if (source) native.closeGlassSource(source.session);
        source = await native.openGlassSource();
        if (disposed || !visible) {
          native.closeGlassSource(source.session);
          return;
        }
        geometry = source;
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.sourceId,
              maxWidth: Math.round(source.displayWidth * window.devicePixelRatio),
              maxHeight: Math.round(source.displayHeight * window.devicePixelRatio),
              maxFrameRate: 24,
            },
          } as MediaTrackConstraints,
        };
        const incoming = await navigator.mediaDevices.getUserMedia(constraints);
        if (disposed || !visible) {
          incoming.getTracks().forEach((track) => track.stop());
          native.closeGlassSource(source.session);
          return;
        }
        stream = incoming;
        incoming.getVideoTracks()[0]?.addEventListener('ended', () => fail('Desktop stream ended'));
        video.srcObject = stream;
        await video.play();
        if (!disposed) setError('');
      } finally {
        starting = false;
      }
    };
    try {
      renderer = createGlassRenderer(element);
      mutation.observe(document.querySelector('.workbench') ?? document.body, {
        childList: true,
        subtree: true,
      });
      observe();
      window.addEventListener('pointermove', pointer);
      frame = requestAnimationFrame(paint);
      void start().catch(fail);
    } catch (reason) {
      fail(reason);
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      unsubscribe();
      unsubscribeVisible();
      window.removeEventListener('pointermove', pointer);
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      renderer?.dispose();
      if (source) native.closeGlassSource(source.session);
      delete document.documentElement.dataset.opticalGlass;
    };
  }, [enabled, reducedMotion]);
  return (
    <>
      <canvas ref={canvas} className="live-glass-canvas" aria-hidden="true" />
      {enabled && !error && (
        <span
          className="glass-live-label"
          title="Desktop image processed locally. No recording or upload."
        >
          Live glass · local
        </span>
      )}
      {enabled && error && (
        <div className="glass-error" role="alert">
          Live glass could not start: {error}. Toggle Liquid glass off and on to retry.
        </div>
      )}
    </>
  );
}
