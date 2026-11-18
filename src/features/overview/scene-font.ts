export const sceneFont = '/fonts/JetBrainsMono-Regular.ttf';
let failure: unknown;

// Troika's font loader does not reject failed requests. Fail visibly before its SDF work starts.
export const sceneFontReady = fetch(sceneFont, { signal: AbortSignal.timeout(10000) })
  .then(async (response) => {
    if (!response.ok) throw new Error(`Scene font is unavailable (${response.status}).`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 4 || bytes[0] !== 0 || bytes[1] !== 1 || bytes[2] !== 0 || bytes[3] !== 0)
      throw new Error('The scene font response is invalid.');
  })
  .catch((error: unknown) => {
    failure = error;
  });

export function assertSceneFont(): void {
  if (failure) throw failure;
}
