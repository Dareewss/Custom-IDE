import { expect, it } from 'vitest';
import { createMailbox, readMailbox, writeMailbox } from './mailbox';
it('transfers UTF-8 input including empty lines', () => {
  const buffer = createMailbox();
  writeMailbox(buffer, 'Bună 🌍');
  expect(readMailbox(buffer)).toBe('Bună 🌍');
  writeMailbox(buffer, '');
  expect(readMailbox(buffer)).toBe('');
  expect(() => writeMailbox(buffer, 'x'.repeat(70_000))).toThrow();
});
