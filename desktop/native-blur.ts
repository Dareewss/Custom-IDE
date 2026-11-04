import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

export function windowHandleArgument(handle: Buffer): string {
  if (handle.length !== 4 && handle.length !== 8) throw new Error('Invalid native window handle');
  const value = handle.length === 8 ? handle.readBigUInt64LE() : BigInt(handle.readUInt32LE());
  if (value === 0n) throw new Error('Missing native window handle');
  return value.toString();
}

export function parseBlurAcknowledgement(output: string, enabled: boolean): boolean {
  const value: unknown = JSON.parse(output);
  if (
    !value ||
    typeof value !== 'object' ||
    !('accepted' in value) ||
    value.accepted !== true ||
    !('enabled' in value) ||
    value.enabled !== enabled ||
    !('accentState' in value) ||
    value.accentState !== (enabled ? 4 : 0) ||
    !('tintAlpha' in value) ||
    value.tintAlpha !== (enabled ? 1 : 0)
  )
    throw new Error('Windows did not acknowledge the desktop blur request');
  return enabled;
}

// Serialize native processes so rapid on/off requests cannot finish out of order.
export function createBlurQueue() {
  let pending: Promise<unknown> = Promise.resolve();
  return <T>(operation: () => Promise<T>): Promise<T> => {
    const result = pending.then(operation);
    pending = result.catch(() => {});
    return result;
  };
}

export async function setNativeDesktopBlur(
  helper: string,
  handle: Buffer,
  owner: number,
  enabled: boolean,
): Promise<boolean> {
  if (!Number.isInteger(owner) || owner <= 0) throw new Error('Invalid window owner');
  const { stdout } = await execute(
    helper,
    [windowHandleArgument(handle), String(owner), enabled ? 'on' : 'off'],
    {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 4096,
    },
  );
  return parseBlurAcknowledgement(stdout, enabled);
}
