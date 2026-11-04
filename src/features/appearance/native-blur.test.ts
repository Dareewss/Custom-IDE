// @vitest-environment node
import { expect, it } from 'vitest';
import {
  createBlurQueue,
  parseBlurAcknowledgement,
  windowHandleArgument,
} from '../../../desktop/native-blur';

it('preserves native handle precision on 32-bit and 64-bit buffers', () => {
  const large = Buffer.alloc(8);
  large.writeBigUInt64LE(0xfedcba9876543210n);
  expect(windowHandleArgument(large)).toBe('18364758544493064720');
  const small = Buffer.alloc(4);
  small.writeUInt32LE(0xfedcba98);
  expect(windowHandleArgument(small)).toBe('4275878552');
  expect(() => windowHandleArgument(Buffer.alloc(8))).toThrow('Missing');
  expect(() => windowHandleArgument(Buffer.alloc(6))).toThrow('Invalid');
});

it('requires a successful acknowledgement of the requested low-tint native state', () => {
  expect(
    parseBlurAcknowledgement(
      ' {"accepted":true,"enabled":true,"accentState":4,"tintAlpha":1} ',
      true,
    ),
  ).toBe(true);
  expect(
    parseBlurAcknowledgement(
      '{"accepted":true,"enabled":false,"accentState":0,"tintAlpha":0}',
      false,
    ),
  ).toBe(false);
  for (const value of [
    null,
    {},
    { accepted: false },
    { accepted: true, enabled: true, accentState: 4, tintAlpha: 255 },
  ])
    expect(() => parseBlurAcknowledgement(JSON.stringify(value), true)).toThrow();
  expect(() =>
    parseBlurAcknowledgement(
      '{"accepted":true,"enabled":false,"accentState":0,"tintAlpha":0}',
      true,
    ),
  ).toThrow();
  expect(() => parseBlurAcknowledgement('not json', true)).toThrow();
});

it('keeps rapid native requests ordered and recovers after a failed application', async () => {
  const queue = createBlurQueue();
  const order: string[] = [];
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = queue(async () => {
    order.push('on');
    await gate;
    order.push('done');
    return true;
  });
  const failure = queue(async () => {
    order.push('failed');
    throw new Error('Windows refused');
  });
  const rejection = expect(failure).rejects.toThrow('Windows refused');
  const last = queue(async () => {
    order.push('off');
    return false;
  });
  await Promise.resolve();
  expect(order).toEqual(['on']);
  release();
  expect(await first).toBe(true);
  await rejection;
  expect(await last).toBe(false);
  expect(order).toEqual(['on', 'done', 'failed', 'off']);
});
