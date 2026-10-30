export const MAILBOX_HEADER = 16;
export const createMailbox = () => new SharedArrayBuffer(65_552);
export function writeMailbox(buffer: SharedArrayBuffer, text: string) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > buffer.byteLength - MAILBOX_HEADER)
    throw new Error('Input must be smaller than 64 KiB.');
  new Uint8Array(buffer, MAILBOX_HEADER).set(bytes);
  const control = new Int32Array(buffer, 0, 4);
  Atomics.store(control, 1, bytes.length);
  Atomics.store(control, 0, 1);
  Atomics.notify(control, 0);
}
export function readMailbox(buffer: SharedArrayBuffer) {
  return new TextDecoder().decode(
    new Uint8Array(buffer, MAILBOX_HEADER, Atomics.load(new Int32Array(buffer, 0, 4), 1)).slice(),
  );
}
