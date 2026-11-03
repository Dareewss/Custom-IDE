export async function loadWasm(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      `Runtime file unavailable (${response.status}): ${url}. Reconnect to finish caching the app, or reopen the desktop app.`,
    );
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  if (
    bytes.length !== 4 ||
    bytes[0] !== 0 ||
    bytes[1] !== 97 ||
    bytes[2] !== 115 ||
    bytes[3] !== 109
  )
    throw new Error(
      `Invalid WebAssembly response: ${url}. Reconnect to update the app, or reopen the desktop app.`,
    );
  return buffer;
}
